import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const UPDATABLE_FIELDS = ['name', 'startDate', 'endDate', 'progress', 'responsible', 'notes', 'phase', 'color', 'order', 'stage', 'subStage', 'building', 'facade', 'floors', 'scaffoldingNum', 'dependencies', 'cost', 'quantity', 'revenue', 'costLogistics', 'costInstallation', 'costManagement', 'quotedPrice', 'costBreakdown', 'wbsStage', 'customImage', 'customImageRegion', 'sdPhase']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(task)
}

/** Topological sort — returns successor ids in execution order */
function getSuccessorsOrdered(changedId: string, allTasks: { id: string; dependencies: string }[]): string[] {
  const depMap = new Map<string, string[]>()
  for (const t of allTasks) {
    let deps: string[] = []
    try { deps = JSON.parse(t.dependencies || '[]') } catch { deps = [] }
    depMap.set(t.id, deps)
  }

  const visited = new Set<string>()
  const order: string[] = []

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    // visit predecessors first
    for (const pred of depMap.get(id) || []) visit(pred)
    order.push(id)
  }

  for (const t of allTasks) visit(t.id)

  // Return only tasks that come after changedId and depend on it (directly or transitively)
  const dependsOnChanged = new Set<string>()
  function mark(id: string) {
    for (const t of allTasks) {
      let deps: string[] = []
      try { deps = JSON.parse(t.dependencies || '[]') } catch { deps = [] }
      if (deps.includes(id) && !dependsOnChanged.has(t.id)) {
        dependsOnChanged.add(t.id)
        mark(t.id)
      }
    }
  }
  mark(changedId)

  return order.filter(id => dependsOnChanged.has(id))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rawData = await req.json()
  const dryRun = rawData.dryRun === true
  const changedBy = typeof rawData.changedBy === 'string' ? rawData.changedBy : null
  const excludeCascadeIds: string[] = Array.isArray(rawData.excludeCascadeIds) ? rawData.excludeCascadeIds : []

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Strip non-updatable fields
  const data: Record<string, unknown> = {}
  for (const field of UPDATABLE_FIELDS) {
    if (rawData[field] !== undefined) data[field] = rawData[field]
  }

  // Track changes for history
  const trackFields = ['name', 'startDate', 'endDate', 'progress', 'responsible', 'notes', 'phase']
  const changes: { taskId: string; field: string; oldValue: string; newValue: string; changedBy: string | null }[] = []
  for (const field of trackFields) {
    if (data[field] !== undefined && String((existing as any)[field]) !== String(data[field])) {
      changes.push({ taskId: id, field, oldValue: String((existing as any)[field] ?? ''), newValue: String(data[field]), changedBy })
    }
  }

  // Convert date strings to Date objects for Prisma
  if (data.startDate && typeof data.startDate === 'string') data.startDate = new Date(data.startDate)
  if (data.endDate && typeof data.endDate === 'string') data.endDate = new Date(data.endDate)

  let task: any
  if (dryRun) {
    task = { ...existing, ...data }
  } else {
    try {
      task = await prisma.task.update({ where: { id }, data })
    } catch (err: any) {
      console.error('Prisma update error:', err)
      return NextResponse.json({ error: err.message ?? 'DB error' }, { status: 500 })
    }
    if (changes.length > 0) {
      await prisma.taskChange.createMany({ data: changes })
    }
  }

  // Cascade date changes to successors
  const updatedTasks: typeof task[] = [task]
  const dateChanged = data.startDate !== undefined || data.endDate !== undefined

  if (dateChanged) {
    const allTasks = await prisma.task.findMany({ where: { projectId: existing.projectId } })
    const successorIds = getSuccessorsOrdered(id, allTasks)

    if (successorIds.length > 0) {
      // Build a live map of current task dates (incorporating our just-saved task)
      const taskMap = new Map(allTasks.map(t => [t.id, { ...t }]))
      taskMap.set(id, task as any)

      for (const succId of successorIds) {
        if (excludeCascadeIds.includes(succId)) continue // user opted this task out of the push
        const succ = taskMap.get(succId)
        if (!succ) continue

        // Find latest endDate among all predecessors
        let deps: string[] = []
        try { deps = JSON.parse(succ.dependencies || '[]') } catch { deps = [] }

        let latestPredEnd: Date | null = null
        for (const predId of deps) {
          const pred = taskMap.get(predId)
          if (!pred) continue
          const predEnd = new Date(pred.endDate)
          if (!latestPredEnd || predEnd > latestPredEnd) latestPredEnd = predEnd
        }

        if (!latestPredEnd) continue

        // New start = day after latest predecessor end
        const newStart = new Date(latestPredEnd)
        newStart.setDate(newStart.getDate() + 1)

        const currentStart = new Date(succ.startDate)
        const currentEnd = new Date(succ.endDate)
        const duration = currentEnd.getTime() - currentStart.getTime()

        const newEnd = new Date(newStart.getTime() + duration)

        if (newStart.getTime() === currentStart.getTime()) continue // no change

        const updated = dryRun
          ? { ...succ, startDate: newStart, endDate: newEnd }
          : await prisma.task.update({ where: { id: succId }, data: { startDate: newStart, endDate: newEnd } })
        taskMap.set(succId, updated as any)
        updatedTasks.push(updated)
      }
    }
  }

  return NextResponse.json({ task, updatedTasks, dryRun })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.taskChange.deleteMany({ where: { taskId: id } })
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
