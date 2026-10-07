import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const baseline = await prisma.baseline.findUnique({
    where: { id },
    include: { tasks: true },
  })
  if (!baseline) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(baseline)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.baseline.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
