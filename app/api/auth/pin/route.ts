import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { pin } = await request.json()
  const correctPin = process.env.APP_PIN

  if (!correctPin) {
    return NextResponse.json({ error: 'PIN not configured' }, { status: 500 })
  }

  if (pin !== correctPin) {
    return NextResponse.json({ error: 'Verkeerde pincode' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('meatpack_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}