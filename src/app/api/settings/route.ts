import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  })
  const { emailPassword: _omit, ...safe } = settings
  return NextResponse.json(safe)
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const data = await req.json()
  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data
  })
  return NextResponse.json(settings)
}
