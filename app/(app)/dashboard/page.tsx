import { createClient } from '@/lib/supabase/server'

function formatHours(minutes: number) {
  return (minutes / 60).toFixed(1) + ' u'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const firstDay = new Date(y, m, 1).toISOString().split('T')[0]
  const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0]

  // Events this month with time entries
  const { data: events } = await supabase
    .from('events')
    .select('id, title, client_id, event_type_id, is_invoiced')
    .gte('date', firstDay)
    .lte('date', lastDay)

  const eventIds = (events || []).map(e => e.id)

  const { data: entries } = eventIds.length
    ? await supabase.from('time_entries').select('*').in('event_id', eventIds)
    : { data: [] }

  const { data: eventTypes } = await supabase.from('event_types').select('*')
  const { data: clients } = await supabase.from('clients').select('*')
  const { data: adjustments } = await supabase.from('overtime_adjustments').select('*')

  // Invoice totals
  const invoiceEventIds = new Set(
    (events || []).filter(e => {
      const et = (eventTypes || []).find(t => t.id === e.event_type_id)
      return et?.billing_type === 'invoice'
    }).map(e => e.id)
  )
  const overtimeEventIds = new Set(
    (events || []).filter(e => {
      const et = (eventTypes || []).find(t => t.id === e.event_type_id)
      return et?.billing_type === 'overtime'
    }).map(e => e.id)
  )

  let invoiceMinutes = 0
  let invoiceAmount = 0
  let overtimeMinutes = 0

  for (const entry of (entries || [])) {
    const mins = entry.duration_minutes || 0
    if (invoiceEventIds.has(entry.event_id)) {
      invoiceMinutes += mins
      const event = (events || []).find(e => e.id === entry.event_id)
      const et = (eventTypes || []).find(t => t.id === event?.event_type_id)
      invoiceAmount += (mins / 60) * (et?.hourly_rate || 0)
    }
    if (overtimeEventIds.has(entry.event_id)) {
      overtimeMinutes += mins
    }
  }

  // All-time overtime balance
  const { data: allOvertimeEntries } = await supabase
    .from('time_entries')
    .select('event_id, duration_minutes')

  const { data: allEvents } = await supabase.from('events').select('id, event_type_id')
  const overtimeTypeIds = new Set(
    (eventTypes || []).filter(t => t.billing_type === 'overtime').map(t => t.id)
  )
  const overtimeEids = new Set(
    (allEvents || []).filter(e => overtimeTypeIds.has(e.event_type_id)).map(e => e.id)
  )

  let totalOvertimeHours = 0
  for (const entry of (allOvertimeEntries || [])) {
    if (overtimeEids.has(entry.event_id)) {
      totalOvertimeHours += (entry.duration_minutes || 0) / 60
    }
  }
  const totalAdjustments = (adjustments || []).reduce((s, a) => s + Number(a.hours), 0)
  const overtimeBalance = totalOvertimeHours + totalAdjustments

  // Top clients
  const clientHours: Record<string, number> = {}
  for (const entry of (entries || [])) {
    const event = (events || []).find(e => e.id === entry.event_id)
    if (event?.client_id) {
      clientHours[event.client_id] = (clientHours[event.client_id] || 0) + (entry.duration_minutes || 0)
    }
  }
  const topClients = Object.entries(clientHours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, mins]) => ({
      name: (clients || []).find(c => c.id === id)?.name || 'Onbekend',
      hours: mins / 60,
    }))

  const monthName = now.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{monthName}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div className="label">Te factureren</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>
            €{invoiceAmount.toFixed(2)}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{formatHours(invoiceMinutes)} deze maand</div>
        </div>

        <div className="card">
          <div className="label">Overuren saldo</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6', marginTop: 8 }}>
            {overtimeBalance.toFixed(1)} u
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{formatHours(overtimeMinutes)} opgebouwd deze maand</div>
        </div>

        <div className="card">
          <div className="label">Top klanten</div>
          {topClients.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>Nog geen data</p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {topClients.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, borderBottom: i < topClients.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span>{c.name}</span>
                  <span style={{ color: 'var(--muted)' }}>{c.hours.toFixed(1)} u</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Events deze maand</div>
        {(events || []).length === 0 ? (
          <div className="empty-state"><p>Geen events deze maand</p></div>
        ) : (
          <div>
            {(events || []).map(event => {
              const et = (eventTypes || []).find(t => t.id === event.event_type_id)
              const client = (clients || []).find(c => c.id === event.client_id)
              const eventEntries = (entries || []).filter(e => e.event_id === event.id)
              const totalMins = eventEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
              return (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{event.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{client?.name || 'Geen klant'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{formatHours(totalMins)}</span>
                    {et && <span className={`badge badge-${et.billing_type}`}>{et.billing_type === 'invoice' ? 'Factuur' : 'Overuren'}</span>}
                    {event.is_invoiced && <span className="badge badge-invoiced">✓</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
