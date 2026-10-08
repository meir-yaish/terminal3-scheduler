import { NextRequest, NextResponse } from 'next/server'

const FINANCE_USERS = (process.env.FINANCE_USERS || '').split(',').map(n => n.trim()).filter(Boolean)

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  const expected = process.env.AUTH_SECRET
  if (!token || !expected || token !== expected.trim()) {
    return NextResponse.json({ allowed: false }, { status: 401 })
  }

  const name = req.nextUrl.searchParams.get('name') || ''
  const allowed = FINANCE_USERS.includes(name)
  return NextResponse.json({ allowed })
}
