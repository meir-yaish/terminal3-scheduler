import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const FINANCE_USERS = (process.env.FINANCE_USERS || '').split(',').map(n => n.trim()).filter(Boolean)

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const allowed = FINANCE_USERS.includes(auth.name)
  return NextResponse.json({ allowed })
}
