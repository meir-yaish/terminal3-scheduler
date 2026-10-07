import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, description: true, createdAt: true, paidPercent: true, expensesPaidPercent: true },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json(projects)
}

export async function PUT(req: NextRequest) {
  const { id, paidPercent, expensesPaidPercent } = await req.json()
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const data: Record<string, number> = {}
  if (typeof paidPercent === 'number') data.paidPercent = paidPercent
  if (typeof expensesPaidPercent === 'number') data.expensesPaidPercent = expensesPaidPercent
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const project = await prisma.project.update({ where: { id }, data })
  return NextResponse.json(project)
}
