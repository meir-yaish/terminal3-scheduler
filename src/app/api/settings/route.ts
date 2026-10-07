import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  })
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const data = await req.json()
  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data
  })
  return NextResponse.json(settings)
}
