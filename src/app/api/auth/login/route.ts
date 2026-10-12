import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken, COOKIE_NAME } from '@/lib/auth'

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

  const jwt = await signToken({ name: recipient.name, email: recipient.email })

  const res = NextResponse.json({ ok: true, name: recipient.name })
  res.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return res
}
