'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EventType, BillingType } from '@/types'

const COLORS = ['#00e5a0', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#10b981', '#f97316', '#ec4899']

export default function SettingsPage() {
  const supabase = createClient()
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EventType | null>(null)
  const [etName, setEtName] = useState('')
  const [etBilling, setEtBilling] = useState<BillingType>('invoice')
  const [etRate, setEtRate] = useState('')
  const [etColor, setEtColor] = useState(COLORS[0])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('event_types').select('*').order('name')
    setEventTypes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setEtName(''); setEtBilling('invoice'); setEtRate(''); setEtColor(COLORS[0])
    setFormError('')
    setShowForm(true)
  }

  function openEdit(et: EventType) {
    setEditing(et)
    setEtName(et.name); setEtBilling(et.billing_type); setEtRate(et.hourly_rate?.toString() || ''); setEtColor(et.color)
    setFormError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!etName.trim()) { setFormError('Naam is verplicht.'); return }
    if (etBilling === 'invoice' && (!etRate || isNaN(parseFloat(etRate)))) {
      setFormError('Vul een geldig uurtarief in voor facturatie.'); return
    }

    setSaving(true)
    const payload = {
      name: etName.trim(),
      billing_type: etBilling,
      hourly_rate: etBilling === 'invoice' ? parseFloat(etRate) : null,
      color: etColor,
    }

    const { error } = editing
      ? await supabase.from('event_types').update(payload).eq('id', editing.id)
      : await supabase.from('event_types').insert(payload)

    setSaving(false)
    if (error) { setFormError(error.message); return }

    setShowForm(false)
    setMsg(editing ? 'Eventtype bijgewerkt' : 'Eventtype toegevoegd')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Wil je "${name}" verwijderen?`)) return
    const { error } = await supabase.from('event_types').delete().eq('id', id)
    if (error) { setMsg('Fout: ' + error.message); return }
    setMsg('Eventtype verwijderd')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Laden...</div>

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Instellingen</h1>
        <button className="btn-primary" onClick={openNew}>+ Nieuw type</button>
      </div>

      {msg && <div className="success-msg" style={{ marginBottom: 20 }}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{editing ? 'Type bewerken' : 'Nieuw eventtype'}</h3>
          <form onSubmit={handleSave}>
            {formError && <div className="error-msg" style={{ marginBottom: 16 }}>{formError}</div>}
            <div style={{ marginBottom: 12 }}>
              <label className="label">Naam *</label>
              <input type="text" value={etName} onChange={e => setEtName(e.target.value)} placeholder="bv. Privéverhuur" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['invoice', 'overtime'] as BillingType[]).map(t => (
                  <button key={t} type="button"
                    className={etBilling === t ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => setEtBilling(t)}>
                    {t === 'invoice' ? '💶 Facturatie' : '⏱️ Overuren'}
                  </button>
                ))}
              </div>
            </div>
            {etBilling === 'invoice' && (
              <div style={{ marginBottom: 12 }}>
                <label className="label">Uurtarief (€) *</label>
                <input type="number" min="0" step="5" value={etRate} onChange={e => setEtRate(e.target.value)} placeholder="75" />
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label className="label">Kleur</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setEtColor(c)} style={{
                    width: 32, height: 32, borderRadius: '50%', background: c, border: etColor === c ? '3px solid white' : '3px solid transparent',
                    outline: etColor === c ? `2px solid ${c}` : 'none', cursor: 'pointer', padding: 0,
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Annuleren</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Eventtypes</div>
        {eventTypes.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}><p>Nog geen eventtypes</p></div>
        ) : (
          eventTypes.map(et => (
            <div key={et.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: et.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{et.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {et.billing_type === 'invoice' ? `€${et.hourly_rate}/u` : 'Overuren'}
                  </div>
                </div>
                <span className={`badge badge-${et.billing_type}`}>
                  {et.billing_type === 'invoice' ? 'Facturatie' : 'Overuren'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => openEdit(et)}>Bewerken</button>
                <button className="btn-danger" style={{ fontSize: 13 }} onClick={() => handleDelete(et.id, et.name)}>Verwijder</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
