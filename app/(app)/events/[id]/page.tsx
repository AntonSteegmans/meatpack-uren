'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventType, Client, TimeEntry } from '@/types'

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}u ${m}m` : `${m}m`
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single()
    if (!ev) { setError('Event niet gevonden'); setLoading(false); return }
    setEvent(ev)

    const [{ data: et }, { data: cl }, { data: en }] = await Promise.all([
      ev.event_type_id ? supabase.from('event_types').select('*').eq('id', ev.event_type_id).single() : { data: null },
      ev.client_id ? supabase.from('clients').select('*').eq('id', ev.client_id).single() : { data: null },
      supabase.from('time_entries').select('*').eq('event_id', id).order('start_time'),
    ])

    setEventType(et)
    setClient(cl)
    setEntries(en || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function toggleInvoiced() {
    if (!event) return
    const { error } = await supabase.from('events').update({ is_invoiced: !event.is_invoiced }).eq('id', id)
    if (error) { setError(error.message); return }
    setEvent({ ...event, is_invoiced: !event.is_invoiced })
    setMsg(event.is_invoiced ? 'Markering verwijderd' : 'Gemarkeerd als gefactureerd')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Wil je deze tijdregistratie verwijderen?')) return
    const { error } = await supabase.from('time_entries').delete().eq('id', entryId)
    if (error) { setError(error.message); return }
    setEntries(entries.filter(e => e.id !== entryId))
    setMsg('Tijdregistratie verwijderd')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    setModalError('')
    if (!startTime || !endTime) { setModalError('Vul start- en eindtijd in.'); return }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) { setModalError('Eindtijd moet na starttijd liggen.'); return }

    const duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    setSaving(true)

    const { data, error } = await supabase.from('time_entries').insert({
      event_id: id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes,
      entry_method: 'manual',
    }).select().single()

    setSaving(false)
    if (error) { setModalError(error.message); return }

    setEntries([...entries, data])
    setShowModal(false)
    setStartTime('')
    setEndTime('')
    setMsg('Uren toegevoegd')
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Laden...</div>
  if (error) return <div className="error-msg" style={{ margin: 40 }}>{error}</div>
  if (!event) return null

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const totalHours = totalMinutes / 60
  const amount = eventType?.billing_type === 'invoice' ? totalHours * (eventType.hourly_rate || 0) : null

  // Default datetime for new entry: today at 18:00 - 00:00
  const todayDate = event.date || new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => router.back()}>← Terug</button>
      </div>

      {msg && <div className="success-msg" style={{ marginBottom: 20 }}>{msg}</div>}

      {/* Facturatie kaart */}
      <div className="card" style={{
        marginBottom: 20,
        background: eventType ? `linear-gradient(135deg, ${eventType.color}11, var(--surface))` : undefined,
        borderColor: eventType?.color || 'var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{event.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
              {client?.name && <span>{client.name} · </span>}
              {new Date(event.date).toLocaleDateString('nl-BE', { dateStyle: 'long' })}
            </div>
            {eventType && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: eventType.color, display: 'inline-block' }} />
                <span style={{ fontSize: 13 }}>{eventType.name}</span>
                <span className={`badge badge-${eventType.billing_type}`}>
                  {eventType.billing_type === 'invoice' ? 'Facturatie' : 'Overuren'}
                </span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {eventType?.billing_type === 'invoice' && eventType.hourly_rate && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                Tarief: €{eventType.hourly_rate}/u
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{totalHours.toFixed(2)} u</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: eventType?.color || 'var(--accent)' }}>
              {amount !== null ? `€${amount.toFixed(2)}` : <span style={{ color: '#8b5cf6' }}>Overuren</span>}
            </div>
            {event.is_invoiced && <div className="badge badge-invoiced" style={{ marginTop: 6 }}>✓ Gefactureerd</div>}
          </div>
        </div>

        {event.notes && (
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13, color: 'var(--muted)' }}>
            {event.notes}
          </div>
        )}
      </div>

      {/* Time entries */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>Tijdregistraties</div>
          <button className="btn-primary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => {
            setStartTime(`${todayDate}T18:00`)
            setEndTime(`${todayDate}T00:00`)
            setShowModal(true)
          }}>+ Uren toevoegen</button>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p>Nog geen uren geregistreerd</p>
          </div>
        ) : (
          <div>
            {entries.map(entry => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14 }}>
                    {new Date(entry.start_time).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' })}
                    {' → '}
                    {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('nl-BE', { timeStyle: 'short' }) : 'lopend'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {entry.duration_minutes ? formatDuration(entry.duration_minutes) : '—'}
                  </div>
                </div>
                <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => deleteEntry(entry.id)}>
                  Verwijder
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 600 }}>
              <span>Totaal</span>
              <span>{totalHours.toFixed(2)} u{amount !== null ? ` · €${amount.toFixed(2)}` : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {eventType?.billing_type === 'invoice' && (
        <button
          className={event.is_invoiced ? 'btn-ghost' : 'btn-primary'}
          onClick={toggleInvoiced}>
          {event.is_invoiced ? '↩ Markering verwijderen' : '✓ Markeer als gefactureerd'}
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Uren toevoegen</h2>
            <form onSubmit={handleAddEntry}>
              {modalError && <div className="error-msg" style={{ marginBottom: 16 }}>{modalError}</div>}
              <div style={{ marginBottom: 16 }}>
                <label className="label">Starttijd *</label>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Eindtijd *</label>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
              {startTime && endTime && new Date(endTime) > new Date(startTime) && (
                <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 16 }}>
                  Duur: {formatDuration(Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
