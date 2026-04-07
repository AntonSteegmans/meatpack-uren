import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })

  const { data: eventTypes } = await supabase.from('event_types').select('*')
  const { data: clients } = await supabase.from('clients').select('*')

  const eventIds = (events || []).map(e => e.id)
  const { data: entries } = eventIds.length
    ? await supabase.from('time_entries').select('event_id, duration_minutes').in('event_id', eventIds)
    : { data: [] }

  const hoursMap: Record<string, number> = {}
  for (const entry of (entries || [])) {
    hoursMap[entry.event_id] = (hoursMap[entry.event_id] || 0) + (entry.duration_minutes || 0)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Events</h1>
        <Link href="/events/new">
          <button className="btn-primary">+ Nieuw event</button>
        </Link>
      </div>

      {(events || []).length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>📅</div>
          <p>Nog geen events — maak je eerste event aan.</p>
          <Link href="/events/new" style={{ display: 'inline-block', marginTop: 16 }}>
            <button className="btn-primary">+ Nieuw event</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(events || []).map(event => {
            const et = (eventTypes || []).find(t => t.id === event.event_type_id)
            const client = (clients || []).find(c => c.id === event.client_id)
            const totalMins = hoursMap[event.id] || 0
            return (
              <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{event.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      {client?.name || 'Geen klant'} · {new Date(event.date).toLocaleDateString('nl-BE')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{(totalMins / 60).toFixed(1)} u</span>
                    {et && (
                      <span className="badge" style={{ backgroundColor: et.color + '22', color: et.color }}>
                        {et.name}
                      </span>
                    )}
                    {event.is_invoiced && <span className="badge badge-invoiced">Gefactureerd</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}