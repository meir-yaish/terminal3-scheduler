import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const milestones = await prisma.milestone.findMany({
    where: projectId ? { projectId } : {},
    orderBy: { date: 'asc' }
  })

  // "סיום פרויקט" always reflects the latest-finishing task, computed live rather than stored.
  const projectEnd = milestones.find(m => m.name === 'סיום פרויקט')
  if (projectEnd) {
    const lastTask = await prisma.task.findFirst({
      where: projectId ? { projectId } : {},
      orderBy: { endDate: 'desc' }
    })
    if (lastTask) projectEnd.date = lastTask.endDate
  }

  return NextResponse.json(milestones.sort((a, b) => a.date.getTime() - b.date.getTime()))
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (data.date && typeof data.date === 'string') data.date = new Date(data.date)
  const milestone = await prisma.milestone.create({ data })
  return NextResponse.json(milestone)
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  if (data.date && typeof data.date === 'string') data.date = new Date(data.date)
  const milestone = await prisma.milestone.update({ where: { id }, data })
  return NextResponse.json(milestone)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.milestone.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
