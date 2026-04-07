'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Client, EventType } from '@/types'

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [clientId, setClientId] = useState('')
  const [eventTypeId, setEventTypeId] = useState('')
  const [notes, setNotes] = useState('')

  // Quick add client
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientVat, setNewClientVat] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')

  useEffect(() => {
    supabase.from('clients').select('*').order('name').then(({ data }) => setClients(data || []))
    supabase.from('event_types').select('*').order('name').then(({ data }) => {
      setEventTypes(data || [])
      if (data && data.length > 0) setEventTypeId(data[0].id)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Vul een titel in.'); return }
    if (!date) { setError('Vul een datum in.'); return }
    if (!eventTypeId) { setError('Selecteer een eventtype.'); return }

    setLoading(true)
    try {
      let finalClientId = clientId || null

      // Create new client if needed
      if (showNewClient && newClientName.trim()) {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({ name: newClientName.trim(), vat_number: newClientVat || null, email: newClientEmail || null })
          .select()
          .single()
        if (clientErr) throw clientErr
        finalClientId = newClient.id
      }

      const { data: event, error: eventErr } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          date,
          client_id: finalClientId,
          event_type_id: eventTypeId,
          notes: notes.trim() || null,
          is_invoiced: false,
        })
        .select()
        .single()

      if (eventErr) throw eventErr
      router.push(`/events/${event.id}`)
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Nieuw event</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg" style={{ marginBottom: 20 }}>{error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label className="label">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Naam van het event"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Datum *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Eventtype *</label>
            <select value={eventTypeId} onChange={e => setEventTypeId(e.target.value)}>
              <option value="">— Selecteer eventtype —</option>
              {eventTypes.map(et => (
                <option key={et.id} value={et.id}>
                  {et.name} ({et.billing_type === 'invoice' ? `€${et.hourly_rate}/u` : 'Overuren'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="label">Klant</label>
            {!showNewClient ? (
              <select value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Geen klant —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : null}
          </div>

          <div style={{ marginBottom: 16 }}>
            <button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }}
              onClick={() => { setShowNewClient(!showNewClient); setClientId('') }}>
              {showNewClient ? '← Bestaande klant kiezen' : '+ Nieuwe klant aanmaken'}
            </button>
          </div>

          {showNewClient && (
            <div style={{ background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Naam klant *</label>
                <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Bedrijfsnaam" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">BTW-nummer</label>
                <input type="text" value={newClientVat} onChange={e => setNewClientVat(e.target.value)} placeholder="BE0123456789" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="factuur@bedrijf.be" />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label className="label">Notities</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optionele notities..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Opslaan...' : 'Event aanmaken'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.back()}>Annuleren</button>
          </div>
        </form>
      </div>
    </div>
  )
}
