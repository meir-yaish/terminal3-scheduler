import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  addWorkingDays,
  countMonFriDays,
  nextWorkingDay,
  calendarForResponsible,
  CalendarType,
} from '@/lib/calendar'

// Known engineering durations from Excel (days per building, per floor range)
// Calendar: Israel (שרשרת ספקה) or Portugal (עשת קלריאו)
const ORDER_PREP_DURATIONS: Record<string, { days: number; cal: CalendarType }> = {
  'הכנת הזמנת עוגנים — SD1':                    { days: 13, cal: 'israel' },
  'הכנת הזמנת אלומיניום כולל קמרטונים — SD1':  { days: 13, cal: 'israel' },
  'הכנת הזמנת זכוכיות — SD1':                   { days: 13, cal: 'israel' },
  'הכנת הזמנת עוגנים — SD2':                    { days: 11, cal: 'israel' },
  'הכנת הזמנת אלומיניום כולל קמרטונים — SD2':  { days: 11, cal: 'israel' },
  'הכנת הזמנת זכוכיות — SD2':                   { days: 11, cal: 'israel' },
  'הכנת הזמנת עוגנים — SD3':                    { days: 1,  cal: 'israel' },
  'הכנת הזמנת אלומיניום כולל קמרטונים — SD3':  { days: 1,  cal: 'israel' },
  'הכנת הזמנת זכוכיות — SD3':                   { days: 3,  cal: 'israel' },
}

// Phases that cascade sequentially
const CASCADE_PHASES = ['הרכבה בניין B', 'הרכבה בניין A', 'גשר']

export async function POST() {
  const project = await prisma.project.findFirst()
  if (!project) return NextResponse.json({ error: 'No project' }, { status: 404 })

  const log: any[] = []

  // ── 1. Fix order-prep tasks with known durations + correct calendar ──────
  for (const [name, { days, cal }] of Object.entries(ORDER_PREP_DURATIONS)) {
    const task = await prisma.task.findFirst({ where: { name, projectId: project.id } })
    if (!task) { log.push({ name, status: 'not_found' }); continue }
    const start = nextWorkingDay(task.startDate, cal)
    const end   = addWorkingDays(start, days, cal)
    await prisma.task.update({ where: { id: task.id }, data: { startDate: start, endDate: end } })
    log.push({ name, cal, days, start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
  }

  // ── 2. Fix non-cascaded tasks: keep startDate, recalculate endDate ────────
  //    For SD תכנון + הוראות ייצור + שרשרת ספקה (non-order-prep)
  const fixPhases = ['תיכנון', 'הוראות ייצור', 'שרשרת ספקה', 'שלד', 'קומת קרקע', 'בקרת איכות']
  const orderPrepNames = new Set(Object.keys(ORDER_PREP_DURATIONS))

  for (const phase of fixPhases) {
    const tasks = await prisma.task.findMany({
      where: { phase, projectId: project.id },
      orderBy: { order: 'asc' },
    })
    for (const task of tasks) {
      if (orderPrepNames.has(task.name)) continue // already handled
      const cal = calendarForResponsible(task.responsible)
      const duration = countMonFriDays(task.startDate, task.endDate)
      if (duration <= 0) continue
      const start = nextWorkingDay(task.startDate, cal)
      const end   = addWorkingDays(start, duration, cal)
      await prisma.task.update({ where: { id: task.id }, data: { startDate: start, endDate: end } })
      log.push({ name: task.name, cal, duration, start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
    }
  }

  // ── 3. Cascade sequential assembly phases ─────────────────────────────────
  for (const phase of CASCADE_PHASES) {
    const tasks = await prisma.task.findMany({
      where: { phase, projectId: project.id },
      orderBy: { order: 'asc' },
    })
    if (!tasks.length) continue

    // Anchor: keep the start of the first task (it depends on skeleton progress)
    let cursor = nextWorkingDay(tasks[0].startDate, 'israel')

    for (const task of tasks) {
      const duration = countMonFriDays(task.startDate, task.endDate)
      if (duration <= 0) {
        // Zero-duration task: just ensure startDate is a working day
        const start = nextWorkingDay(cursor, 'israel')
        await prisma.task.update({ where: { id: task.id }, data: { startDate: start, endDate: start } })
        log.push({ name: task.name, phase, duration: 0, start: start.toISOString().split('T')[0] })
        continue
      }
      const start = nextWorkingDay(cursor, 'israel')
      const end   = addWorkingDays(start, duration, 'israel')
      await prisma.task.update({ where: { id: task.id }, data: { startDate: start, endDate: end } })
      log.push({ name: task.name, phase, duration, start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
      cursor = end
    }
  }

  return NextResponse.json({ success: true, updated: log.length, log })
}
