import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const taskId = req.nextUrl.searchParams.get('taskId')
  const items = await prisma.procurementItem.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(taskId ? { taskId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (data.neededByDate && typeof data.neededByDate === 'string') data.neededByDate = new Date(data.neededByDate)
  if (!data.projectId && data.taskId) {
    const task = await prisma.task.findUnique({ where: { id: data.taskId } })
    if (task) data.projectId = task.projectId
  }
  const item = await prisma.procurementItem.create({ data })
  return NextResponse.json(item)
}
