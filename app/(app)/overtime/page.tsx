'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TimeEntry, OvertimeAdjustment, Event, EventType } from '@/types'

export default function OvertimePage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<(TimeEntry & { event?: Event })[]>([])
  const [adjustments, setAdjustments] = useState<OvertimeAdjustment[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [adjHours, setAdjHours] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const { data: eventTypes } = await supabase.from('event_types').select('*')
    const overtimeTypeIds = new Set((eventTypes || []).filter((t: EventType) => t.billing_type === 'overtime').map((t: EventType) => t.id))

    const { data: events } = await supabase.from('events').select('*')
    const overtimeEvents = (events || []).filter((e: Event) => overtimeTypeIds.has(e.event_type_id || ''))
    const overtimeEventIds = overtimeEvents.map((e: Event) => e.id)

    const { data: en } = overtimeEventIds.length
      ? await supabase.from('time_entries').select('*').in('event_id', overtimeEventIds).order('start_time', { ascending: false })
      : { data: [] }

    const enriched = (en || []).map((entry: TimeEntry) => ({
      ...entry,
      event: overtimeEvents.find((e: Event) => e.id === entry.event_id),
    }))

    const { data: adj } = await supabase.from('overtime_adjustments').select('*').order('date', { ascending: false })

    const totalMinutes = (en || []).reduce((s: number, e: TimeEntry) => s + (e.duration_minutes || 0), 0)
    const totalAdj = (adj || []).reduce((s: number, a: OvertimeAdjustment) => s + Number(a.hours), 0)

    setEntries(enriched)
    setAdjustments(adj || [])
    setBalance(totalMinutes / 60 + totalAdj)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleTakeOvertime(e: React.FormEvent) {
    e.preventDefault()
    setModalError('')
    const hours = parseFloat(adjHours)
    if (isNaN(hours) || hours === 0) { setModalError('Vul een geldig aantal uren in.'); return }
    if (!adjDate) { setModalError('Vul een datum in.'); return }

    setSaving(true)
    const { error } = await supabase.from('overtime_adjustments').insert({
      hours: -Math.abs(hours), // negative = taken
      reason: adjReason || null,
      date: adjDate,
    })
    setSaving(false)
    if (error) { setModalError(error.message); return }

    setShowModal(false)
    setAdjHours('')
    setAdjReason('')
    setMsg('Overuren opgenomen')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Laden...</div>

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Overuren</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>Overuren opnemen</button>
      </div>

      {msg && <div className="success-msg" style={{ marginBottom: 20 }}>{msg}</div>}

      {/* Balance card */}
      <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), var(--surface))', borderColor: '#8b5cf6' }}>
        <div className="label">Huidig saldo</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: balance >= 0 ? '#8b5cf6' : '#ff4444', marginTop: 8 }}>
          {balance >= 0 ? '+' : ''}{balance.toFixed(1)} u
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          {balance >= 0 ? 'nog op te nemen' : 'te veel opgenomen'}
        </div>
      </div>

      {/* Overtime entries */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Opgebouwde overuren</div>
        {entries.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}><p>Geen overtimeregistraties gevonden</p></div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <div>
                <div>{entry.event?.title || 'Onbekend event'}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {new Date(entry.start_time).toLocaleDateString('nl-BE')}
                </div>
              </div>
              <div style={{ color: '#8b5cf6', fontWeight: 600 }}>
                +{((entry.duration_minutes || 0) / 60).toFixed(1)} u
              </div>
            </div>
          ))
        )}
      </div>

      {/* Adjustments */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Opgenomen overuren</div>
        {adjustments.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}><p>Nog geen overuren opgenomen</p></div>
        ) : (
          adjustments.map(adj => (
            <div key={adj.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <div>
                <div>{adj.reason || 'Opgenomen'}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(adj.date).toLocaleDateString('nl-BE')}</div>
              </div>
              <div style={{ color: Number(adj.hours) < 0 ? '#ff6666' : '#10b981', fontWeight: 600 }}>
                {Number(adj.hours) > 0 ? '+' : ''}{Number(adj.hours).toFixed(1)} u
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Overuren opnemen</h2>
            <form onSubmit={handleTakeOvertime}>
              {modalError && <div className="error-msg" style={{ marginBottom: 16 }}>{modalError}</div>}
              <div style={{ marginBottom: 16 }}>
                <label className="label">Aantal uren *</label>
                <input type="number" step="0.5" min="0.5" value={adjHours} onChange={e => setAdjHours(e.target.value)} placeholder="8" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Reden</label>
                <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Vrije dag, compensatie, ..." />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Datum *</label>
                <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Opslaan...' : 'Opnemen'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
