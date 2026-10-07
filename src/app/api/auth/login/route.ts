import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email, phone } = await req.json()

  if (!email || !phone) {
    return NextResponse.json({ error: 'חסר אימייל או סיסמה' }, { status: 400 })
  }

  const recipient = await prisma.recipient.findFirst({
    where: { email, active: true },
  })

  if (!recipient || !recipient.phone || recipient.phone.trim() !== phone.trim()) {
    return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 })
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true, name: recipient.name })
  res.cookies.set('auth_token', secret.trim(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return res
}
