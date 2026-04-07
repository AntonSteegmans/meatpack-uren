'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types'

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Form
  const [editing, setEditing] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [vat, setVat] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setName(''); setVat(''); setEmail('')
    setFormError('')
    setShowForm(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    setName(c.name); setVat(c.vat_number || ''); setEmail(c.email || '')
    setFormError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name.trim()) { setFormError('Naam is verplicht.'); return }
    setSaving(true)

    if (editing) {
      const { error } = await supabase.from('clients').update({ name: name.trim(), vat_number: vat || null, email: email || null }).eq('id', editing.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('clients').insert({ name: name.trim(), vat_number: vat || null, email: email || null })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    setMsg(editing ? 'Klant bijgewerkt' : 'Klant toegevoegd')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Laden...</div>

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Klanten</h1>
        <button className="btn-primary" onClick={openNew}>+ Nieuwe klant</button>
      </div>

      {msg && <div className="success-msg" style={{ marginBottom: 20 }}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{editing ? 'Klant bewerken' : 'Nieuwe klant'}</h3>
          <form onSubmit={handleSave}>
            {formError && <div className="error-msg" style={{ marginBottom: 16 }}>{formError}</div>}
            <div style={{ marginBottom: 12 }}>
              <label className="label">Naam *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Bedrijfsnaam" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">BTW-nummer</label>
              <input type="text" value={vat} onChange={e => setVat(e.target.value)} placeholder="BE0123456789" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="factuur@bedrijf.be" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Annuleren</button>
            </div>
          </form>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>👥</div>
          <p>Nog geen klanten — voeg je eerste klant toe.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clients.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {[c.vat_number, c.email].filter(Boolean).join(' · ') || 'Geen contactinfo'}
                </div>
              </div>
              <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => openEdit(c)}>Bewerken</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
