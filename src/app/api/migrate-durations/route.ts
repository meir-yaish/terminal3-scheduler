import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay() // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) added++
  }
  return d
}

// Aggregated durations from Excel (per-building max for each SD × activity)
const DURATION_MAP: Record<string, number> = {
  'הכנת הזמנת עוגנים — SD1': 13,
  'הכנת הזמנת אלומיניום כולל קמרטונים — SD1': 13,
  'הכנת הזמנת זכוכיות — SD1': 13,
  'הכנת הזמנת עוגנים — SD2': 11,
  'הכנת הזמנת אלומיניום כולל קמרטונים — SD2': 11,
  'הכנת הזמנת זכוכיות — SD2': 11,
  'הכנת הזמנת עוגנים — SD3': 1,
  'הכנת הזמנת אלומיניום כולל קמרטונים — SD3': 1,
  'הכנת הזמנת זכוכיות — SD3': 3,
}

export async function POST() {
  const results: any[] = []

  for (const [taskName, days] of Object.entries(DURATION_MAP)) {
    const task = await prisma.task.findFirst({ where: { name: taskName } })
    if (!task) {
      results.push({ name: taskName, status: 'not_found' })
      continue
    }

    const newEndDate = addBusinessDays(task.startDate, days)
    await prisma.task.update({
      where: { id: task.id },
      data: { endDate: newEndDate }
    })

    results.push({
      name: taskName,
      status: 'updated',
      start: task.startDate.toISOString().split('T')[0],
      end: newEndDate.toISOString().split('T')[0],
      days
    })
  }

  return NextResponse.json({ success: true, results })
}
