import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addWorkingDays, countMonFriDays, nextWorkingDay } from '@/lib/calendar'

// Rule: הזמנת חומרים starts 1 calendar week (7 days) after its SD phase completes
const ORDERING_RULES = [
  { orderTask: 'הזמנת חומרים SD1', predecessorTask: 'תיקונים SD1' },
  { orderTask: 'הזמנת חומרים SD2', predecessorTask: 'הכנת הוראות ייצור SD2' },
]

export async function POST() {
  const project = await prisma.project.findFirst()
  if (!project) return NextResponse.json({ error: 'No project' }, { status: 404 })

  const log: any[] = []

  for (const rule of ORDERING_RULES) {
    const predecessor = await prisma.task.findFirst({ where: { name: rule.predecessorTask, projectId: project.id } })
    const orderTask   = await prisma.task.findFirst({ where: { name: rule.orderTask,       projectId: project.id } })
    if (!predecessor || !orderTask) {
      log.push({ rule: rule.orderTask, status: 'not_found' })
      continue
    }

    // 1 calendar week after predecessor ends
    const gapStart = new Date(predecessor.endDate)
    gapStart.setDate(gapStart.getDate() + 7)
    const newStart = nextWorkingDay(gapStart, 'israel')

    // Keep existing duration (in Mon-Fri working days)
    const duration = countMonFriDays(orderTask.startDate, orderTask.endDate)
    const newEnd   = addWorkingDays(newStart, duration, 'israel')

    await prisma.task.update({
      where: { id: orderTask.id },
      data: { startDate: newStart, endDate: newEnd },
    })

    log.push({
      task: rule.orderTask,
      predecessor: rule.predecessorTask,
      predecessorEnd: predecessor.endDate.toISOString().split('T')[0],
      newStart: newStart.toISOString().split('T')[0],
      newEnd:   newEnd.toISOString().split('T')[0],
      duration,
    })
  }

  return NextResponse.json({ success: true, log })
}
