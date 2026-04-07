'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError('Verkeerde pincode. Probeer opnieuw.')
      setPin('')
    }
  }

  function handleKey(digit: string) {
    if (pin.length < 6) setPin(p => p + digit)
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Meatpack Kempen</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>Urenbeheer</div>
      </div>

      <div className="card" style={{ width: 320, textAlign: 'center' }}>
        <div style={{ fontWeight: 600, marginBottom: 24, fontSize: 16 }}>Voer je pincode in</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.15s',
            }} />
          ))}
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button key={d} type="button" className="btn-ghost"
                style={{ fontSize: 20, fontWeight: 600, padding: '14px 0', borderRadius: 10 }}
                onClick={() => handleKey(d)}>{d}</button>
            ))}
            <div />
            <button type="button" className="btn-ghost"
              style={{ fontSize: 20, fontWeight: 600, padding: '14px 0', borderRadius: 10 }}
              onClick={() => handleKey('0')}>0</button>
            <button type="button" className="btn-ghost"
              style={{ fontSize: 16, padding: '14px 0', borderRadius: 10 }}
              onClick={handleDelete}>⌫</button>
          </div>

          <button type="submit" className="btn-primary"
            style={{ width: '100%', padding: '12px 0', fontSize: 15 }}
            disabled={pin.length < 4 || loading}>
            {loading ? 'Controleren...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}