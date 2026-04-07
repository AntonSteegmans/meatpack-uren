import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Meatpack Kempen — Urenbeheer',
  description: 'Urenbeheer voor Meatpack Kempen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
