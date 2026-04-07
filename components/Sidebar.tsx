'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/overtime', label: 'Overuren', icon: '⏱️' },
  { href: '/clients', label: 'Klanten', icon: '👥' },
  { href: '/settings', label: 'Instellingen', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meatpack Kempen</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Urenbeheer</div>
      </div>
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 4,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              background: active ? 'rgba(0,229,160,0.1)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text)',
              transition: 'background 0.15s',
            }}>
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
