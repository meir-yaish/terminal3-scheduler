import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const baselines = await prisma.baseline.findMany({
    where: projectId ? { projectId } : {},
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tasks: true } } },
  })
  return NextResponse.json(baselines)
}

export async function POST(req: NextRequest) {
  const { projectId, name, createdBy } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const tasks = await prisma.task.findMany({ where: { projectId } })

  const baseline = await prisma.baseline.create({
    data: {
      projectId,
      name: name || new Date().toLocaleDateString('he-IL'),
      createdBy: createdBy ?? null,
      tasks: {
        create: tasks.map(t => ({
          taskId: t.id,
          name: t.name,
          phase: t.phase,
          startDate: t.startDate,
          endDate: t.endDate,
          progress: t.progress,
        })),
      },
    },
    include: { _count: { select: { tasks: true } } },
  })
  return NextResponse.json(baseline)
}
