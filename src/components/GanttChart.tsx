'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { differenceInDays, addMonths } from 'date-fns'
import { JEWISH_HOLIDAYS, MUSLIM_HOLIDAYS } from '@/lib/calendar'
import ProcurementPanel, { ProcurementPanelHandle } from './ProcurementPanel'
import FacadeView from './FacadeView'
import TaskImageEditor from './TaskImageEditor'

interface Task {
  id: string
  name: string
  phase: string
  responsible: string
  startDate: string
  endDate: string
  progress: number
  color: string
  notes?: string | null
  order: number
  stage?: string | null
  subStage?: string | null
  building?: string | null
  facade?: string | null
  floors?: string | null
  scaffoldingNum?: string | null
  quantity?: number | null
  cost?: number | null
  dependencies?: string | null
  changes?: { field: string; oldValue: string | null; newValue: string | null; changedBy: string | null; changedAt: string }[]
}

interface GanttChartProps {
  tasks: Task[]
  onTaskUpdate: (id: string, data: Partial<Task>) => void | Promise<void>
  onTaskDelete?: (id: string) => void | Promise<void>
  taskSerialNumbers?: Record<string, number>
  canEdit?: boolean
  procurementOnly?: boolean
  projectId?: string | null
}

const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const COL_WIDTH   = 90   // px per month
const ROW_HEIGHT  = 48
const LABEL_WIDTH = 380
const YEAR_H      = 26
const MONTH_H     = 24
const WEEK_H      = 22
const HEADER_HEIGHT = YEAR_H + MONTH_H + WEEK_H  // 72

/** Find all predecessor tasks based on the dependencies field. */
function findPredecessors(task: Task, allTasks: Task[]): Task[] {
  let deps: string[] = []
  try { deps = JSON.parse(task.dependencies || '[]') } catch { deps = [] }
  if (deps.length === 0) return []
  const byId = Object.fromEntries(allTasks.map(t => [t.id, t]))
  return deps.map(id => byId[id]).filter(Boolean)
}

/** Find all tasks that depend on this task (successors). */
function findSuccessors(task: Task, allTasks: Task[]): Task[] {
  return allTasks.filter(t => {
    let deps: string[] = []
    try { deps = JSON.parse(t.dependencies || '[]') } catch { deps = [] }
    return deps.includes(task.id)
  })
}

export default function GanttChart({ tasks, onTaskUpdate, onTaskDelete, taskSerialNumbers, canEdit = false, procurementOnly = false, projectId }: GanttChartProps) {
  const [editTask, setEditTask]       = useState<Task | null>(null)
  const [procurementFocusTask, setProcurementFocusTask] = useState<Task | null>(null)
  const [baselineByTaskId, setBaselineByTaskId] = useState<Record<string, { startDate: string; endDate: string }>>({})
  const [showBaseline, setShowBaseline] = useState(true)

  useEffect(() => {
    if (!projectId) { setBaselineByTaskId({}); return }
    let cancelled = false
    fetch(`/api/baselines?projectId=${projectId}`).then(r => r.json()).then(async (list: any[]) => {
      if (cancelled || !list?.length) { if (!cancelled) setBaselineByTaskId({}); return }
      const latest = list[0] // API already orders by createdAt desc
      const full = await fetch(`/api/baselines/${latest.id}`).then(r => r.json())
      if (cancelled) return
      const map: Record<string, { startDate: string; endDate: string }> = {}
      for (const bt of full.tasks || []) map[bt.taskId] = { startDate: bt.startDate, endDate: bt.endDate }
      setBaselineByTaskId(map)
    }).catch(() => { if (!cancelled) setBaselineByTaskId({}) })
    return () => { cancelled = true }
  }, [projectId])
  const procurementRef = useRef<ProcurementPanelHandle>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [tooltip, setTooltip]         = useState<{ task: Task; x: number; y: number } | null>(null)
  const [depSearch, setDepSearch]     = useState('')
  const [succStartOverrides, setSuccStartOverrides] = useState<Record<string, string>>({})
  const [succSearch, setSuccSearch]   = useState('')
  const [succAdd, setSuccAdd]         = useState<string[]>([])
  const [succRemove, setSuccRemove]   = useState<string[]>([])
  const [impactPreview, setImpactPreview] = useState<{ affected: Task[]; onConfirm: (excludeIds: string[]) => void } | null>(null)
  const [checkingImpact, setCheckingImpact] = useState(false)
  const [earlyCompletionPrompt, setEarlyCompletionPrompt] = useState<{ onYes: () => void; onNo: () => void } | null>(null)
  const [excludedFromCascade, setExcludedFromCascade] = useState<Set<string>>(new Set())
  const scrollRef     = useRef<HTMLDivElement>(null)
  const timelineHRef  = useRef<SVGGElement>(null)  // year/month/week row
  const labelsColRef  = useRef<SVGGElement>(null)  // task name column
  const cornerRef     = useRef<SVGGElement>(null)  // top-left corner box
  const todayLabelRef = useRef<SVGGElement>(null)  // "היום" label

  const { MONTHS, WEEK_MONDAYS, years } = useMemo(() => {
    let earliest = new Date('2099-12-31')
    let latest = new Date('2000-01-01')
    for (const t of tasks) {
      const s = new Date(t.startDate)
      const e = new Date(t.endDate)
      if (s < earliest) earliest = s
      if (e > latest) latest = e
    }
    if (tasks.length === 0) {
      earliest = new Date(2025, 10, 1)
      latest = new Date(2028, 11, 31)
    }
    const rangeStart = addMonths(new Date(earliest.getFullYear(), earliest.getMonth(), 1), -12)
    const rangeEnd = addMonths(new Date(latest.getFullYear(), latest.getMonth(), 1), 13)
    const months: Date[] = []
    let md = new Date(rangeStart)
    while (md <= rangeEnd) {
      months.push(new Date(md))
      md = addMonths(md, 1)
    }
    const projStart = months[0]
    const projEnd = addMonths(months[months.length - 1], 1)
    const mondays: Date[] = []
    const wd = new Date(projStart)
    const dow = wd.getDay()
    wd.setDate(wd.getDate() - (dow === 0 ? 6 : dow - 1))
    while (wd < projEnd) {
      mondays.push(new Date(wd))
      wd.setDate(wd.getDate() + 7)
    }
    const yearSet = new Set(months.map(m => m.getFullYear()))
    return { MONTHS: months, WEEK_MONDAYS: mondays, years: Array.from(yearSet).sort() }
  }, [tasks])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      const st = el!.scrollTop
      const sl = el!.scrollLeft
      timelineHRef.current?.setAttribute('transform', `translate(0,${st})`)
      labelsColRef.current?.setAttribute('transform',  `translate(${sl},0)`)
      cornerRef.current?.setAttribute('transform',     `translate(${sl},${st})`)
      todayLabelRef.current?.setAttribute('transform', `translate(0,${st})`)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const totalWidth = LABEL_WIDTH + MONTHS.length * COL_WIDTH

  const phases = [...new Set(tasks.map(t => t.phase))]

  function getBarStyle(task: Task) {
    const projectStart = MONTHS[0]
    const projectEnd   = addMonths(MONTHS[MONTHS.length - 1], 1)
    const totalDays    = differenceInDays(projectEnd, projectStart)
    const startOffset  = Math.max(0, differenceInDays(new Date(task.startDate), projectStart))
    const duration     = Math.max(1, differenceInDays(new Date(task.endDate), new Date(task.startDate)))
    const x     = LABEL_WIDTH + (startOffset / totalDays) * (MONTHS.length * COL_WIDTH)
    const width = Math.max(4, (duration  / totalDays) * (MONTHS.length * COL_WIDTH))
    return { x, width }
  }

  function dateToX(date: Date): number {
    const projectStart = MONTHS[0]
    const projectEnd   = addMonths(MONTHS[MONTHS.length - 1], 1)
    const totalDays    = differenceInDays(projectEnd, projectStart)
    const offset       = differenceInDays(date, projectStart)
    return LABEL_WIDTH + (offset / totalDays) * (MONTHS.length * COL_WIDTH)
  }

  const groupedTasks: { phase: string; tasks: Task[] }[] = phases.map(phase => ({
    phase,
    tasks: tasks.filter(t => t.phase === phase)
  }))

  let rowIndex = 0
  const rows: { type: 'phase' | 'task'; label?: string; task?: Task; y: number; color?: string }[] = []
  for (const group of groupedTasks) {
    rows.push({ type: 'phase', label: group.phase, y: rowIndex * ROW_HEIGHT, color: group.tasks[0]?.color })
    rowIndex++
    for (const task of group.tasks) {
      rows.push({ type: 'task', task, y: rowIndex * ROW_HEIGHT })
      rowIndex++
    }
  }
  const totalHeight = HEADER_HEIGHT + rowIndex * ROW_HEIGHT

  // Pre-compute bar positions for dependency arrows
  const taskBarPos: Record<string, { x: number; width: number; midY: number }> = {}
  for (const row of rows) {
    if (row.type !== 'task') continue
    const task = row.task!
    const { x, width } = getBarStyle(task)
    const midY = HEADER_HEIGHT + row.y + ROW_HEIGHT / 2
    taskBarPos[task.id] = { x, width, midY }
  }

  // Week-line X positions: one per Monday
  const weekLineXs = WEEK_MONDAYS.map(m => dateToX(m))

  // Build holiday bands: group consecutive holiday days into ranges
  function buildHolidayBands(holidays: Set<string>) {
    const projectStart = MONTHS[0]
    const projectEnd   = addMonths(MONTHS[MONTHS.length - 1], 1)
    const sorted = [...holidays].sort()
    const bands: { x: number; width: number }[] = []
    let i = 0
    while (i < sorted.length) {
      const start = new Date(sorted[i] + 'T00:00:00')
      if (start < projectStart || start >= projectEnd) { i++; continue }
      let end = new Date(start)
      end.setDate(end.getDate() + 1)
      while (i + 1 < sorted.length) {
        const next = new Date(sorted[i + 1] + 'T00:00:00')
        const gap = differenceInDays(next, end)
        if (gap <= 1) { end = new Date(next); end.setDate(end.getDate() + 1); i++ }
        else break
      }
      const x = dateToX(start)
      const w = dateToX(end) - x
      if (w > 0) bands.push({ x, width: w })
      i++
    }
    return bands
  }

  const jewishBands = buildHolidayBands(JEWISH_HOLIDAYS)
  const muslimBands = buildHolidayBands(MUSLIM_HOLIDAYS)

  return (
    <div
        ref={scrollRef}
        className="relative overflow-auto border border-gray-200 rounded-lg shadow flex-1 min-h-0"
        style={{ direction: 'ltr' }}
      >
      {/* Edit Modal */}
      {editTask && (() => {
        let editDeps: string[] = []
        try { editDeps = JSON.parse(editTask.dependencies || '[]') } catch { editDeps = [] }
        const editPreds = editDeps.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[]
        const realSuccs = findSuccessors(editTask, tasks).filter(s => !succRemove.includes(s.id))
        const pendingSuccs = succAdd.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[]
        const displaySuccs = [...realSuccs, ...pendingSuccs]
        const depResults = depSearch.trim()
          ? tasks.filter(t => t.id !== editTask.id && !editDeps.includes(t.id) && t.name.includes(depSearch.trim())).slice(0, 6)
          : []
        const succResults = succSearch.trim()
          ? tasks.filter(t => t.id !== editTask.id && !displaySuccs.some(s => s.id === t.id) && t.name.includes(succSearch.trim())).slice(0, 6)
          : []

        function removePred(id: string) {
          const newDeps = editDeps.filter(d => d !== id)
          setEditTask((prev) => prev ? { ...prev, dependencies: JSON.stringify(newDeps) } : prev)
        }
        function addPred(id: string) {
          const newDeps = [...editDeps, id]
          setEditTask((prev) => prev ? { ...prev, dependencies: JSON.stringify(newDeps) } : prev)
          setDepSearch('')
        }
        function addSucc(id: string) {
          setSuccAdd(prev => [...prev, id])
          setSuccSearch('')
        }
        function removeSucc(id: string) {
          if (succAdd.includes(id)) setSuccAdd(prev => prev.filter(x => x !== id))
          else setSuccRemove(prev => [...prev, id])
        }

        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setEditTask(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[1200px] max-w-[95vw] max-h-[90vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-[#1F3864] px-6 pt-6">עריכת משימה</h3>
            <div className="flex gap-4 px-6 py-4 flex-1 min-h-0">
            <div className="flex-1 min-w-0 overflow-y-auto max-h-[72vh] pl-1 space-y-3">

            {/* פעילות קדם */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-blue-700 mb-1">◀ פעילות קדם (מתחיל אחרי)</label>
              <div className="flex flex-wrap gap-1 mb-2 min-h-[28px] p-2 border border-blue-200 rounded-lg bg-blue-50">
                {editPreds.length === 0 && <span className="text-xs text-gray-400">אין פעילות קדם</span>}
                {editPreds.map(p => (
                  <span key={p.id} className="flex items-center gap-1 bg-blue-200 text-blue-900 text-xs px-2 py-1 rounded-full">
                    {p.name}
                    <button onClick={() => removePred(p.id)} className="text-blue-600 hover:text-red-600 font-bold leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="🔍 חפש משימה להוסיף..."
                  value={depSearch}
                  onChange={e => setDepSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
                {depResults.length > 0 && (
                  <div className="absolute top-full right-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                    {depResults.map(t => (
                      <div key={t.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        onClick={e => { e.stopPropagation(); addPred(t.id) }}>
                        {t.name}
                        {t.phase && <span className="text-xs text-gray-400 mr-2">{t.phase}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* פעילות אחרי */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-green-700 mb-1">▶ פעילות אחרי (מניע את)</label>
              <div className="flex flex-wrap gap-1 mb-2 min-h-[28px] p-2 border border-green-200 rounded-lg bg-green-50">
                {displaySuccs.length === 0 && <span className="text-xs text-gray-400">אין פעילות אחרי</span>}
                {displaySuccs.map(s => (
                  <span key={s.id} className="flex items-center gap-1 bg-green-200 text-green-900 text-xs px-2 py-1 rounded-full">
                    {s.name}
                    <button onClick={() => removeSucc(s.id)} className="text-green-700 hover:text-red-600 font-bold leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="relative mb-2">
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="🔍 חפש משימה להוסיף..."
                  value={succSearch}
                  onChange={e => setSuccSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
                {succResults.length > 0 && (
                  <div className="absolute top-full right-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                    {succResults.map(t => (
                      <div key={t.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-0"
                        onClick={e => { e.stopPropagation(); addSucc(t.id) }}>
                        {t.name}
                        {t.phase && <span className="text-xs text-gray-400 mr-2">{t.phase}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {displaySuccs.length > 0 && (
                <div className="space-y-2">
                  {displaySuccs.map(s => (
                    <div key={s.id}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">מתי מתחיל &quot;{s.name}&quot;</label>
                      <input
                        type="date"
                        className="w-full border rounded px-3 py-1.5 text-sm"
                        value={succStartOverrides[s.id] ?? s.startDate.split('T')[0]}
                        onChange={e => setSuccStartOverrides(prev => ({ ...prev, [s.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם משימה</label>
                <input className="w-full border rounded px-3 py-2" value={editTask.name} onChange={e => setEditTask({...editTask, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה</label>
                  <input type="date" className="w-full border rounded px-3 py-2" value={editTask.startDate.split('T')[0]} onChange={e => setEditTask({...editTask, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום</label>
                  <input type="date" className="w-full border rounded px-3 py-2" value={editTask.endDate.split('T')[0]} onChange={e => setEditTask({...editTask, endDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">התקדמות: {editTask.progress}%</label>
                <input type="range" min="0" max="100" className="w-full" value={editTask.progress} onChange={e => setEditTask({...editTask, progress: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אחראי</label>
                <input className="w-full border rounded px-3 py-2" value={editTask.responsible} onChange={e => setEditTask({...editTask, responsible: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כמות</label>
                <div className="flex items-center gap-2">
                  <button type="button" className="w-8 h-8 border rounded hover:bg-gray-100 text-lg leading-none"
                    onClick={() => setEditTask({...editTask, quantity: Math.max(0, (editTask.quantity ?? 0) - 1)})}>−</button>
                  <input type="number" min="0" className="w-20 border rounded px-2 py-1.5 text-center"
                    value={editTask.quantity ?? ''}
                    onChange={e => setEditTask({...editTask, quantity: e.target.value === '' ? null : parseFloat(e.target.value)})} />
                  <button type="button" className="w-8 h-8 border rounded hover:bg-gray-100 text-lg leading-none"
                    onClick={() => setEditTask({...editTask, quantity: (editTask.quantity ?? 0) + 1})}>+</button>
                  <span className="text-xs text-gray-400">יח&apos;</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
                <textarea className="w-full border rounded px-3 py-2" rows={2} value={editTask.notes || ''} onChange={e => setEditTask({...editTask, notes: e.target.value})} />
              </div>
            </div>

            {/* עמודת תמונה + רכש — תמיד גלויה, בלי לגלול */}
            <div className="flex-1 min-w-0 overflow-y-auto max-h-[72vh] pr-1 space-y-3 border-r border-gray-200">
              <div>
                {editTask.phase === 'הרכבה ק.מ חולף' && editTask.building && editTask.facade ? (
                  <FacadeView building={editTask.building} facade={editTask.facade} subStage={editTask.subStage} canEdit={canEdit} />
                ) : (
                  <TaskImageEditor taskId={editTask.id} canEdit={canEdit} />
                )}
              </div>
              <div className="pt-3 border-t border-gray-200">
                <ProcurementPanel ref={procurementRef} taskId={editTask.id} canEdit={canEdit} />
              </div>
            </div>
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6 pt-3 border-t border-gray-200">
              {canEdit && onTaskDelete && (
                <button
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded hover:bg-red-100 ml-auto"
                  onClick={async () => {
                    const id = editTask!.id
                    setEditTask(null); setDepSearch(''); setSuccStartOverrides({}); setSuccAdd([]); setSuccRemove([]); setSuccSearch('')
                    await onTaskDelete(id)
                  }}
                >🗑 מחק משימה</button>
              )}
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => {
                setEditTask(null); setDepSearch(''); setSuccStartOverrides({}); setSuccAdd([]); setSuccRemove([]); setSuccSearch('')
              }}>{canEdit ? 'ביטול' : 'סגור'}</button>
              {canEdit && <button className="px-4 py-2 bg-[#1F3864] text-white rounded hover:bg-blue-800" disabled={checkingImpact} onClick={async () => {
                async function doSave(taskState: Task, excludeIds: string[] = []) {
                  await procurementRef.current?.flushPendingItem()
                  await onTaskUpdate(taskState.id, (excludeIds.length ? { ...taskState, excludeCascadeIds: excludeIds } : taskState) as Partial<Task>)

                  for (const removeId of succRemove) {
                    const target = tasks.find(t => t.id === removeId)
                    if (!target) continue
                    let deps: string[] = []
                    try { deps = JSON.parse(target.dependencies || '[]') } catch { deps = [] }
                    await onTaskUpdate(removeId, { dependencies: JSON.stringify(deps.filter(d => d !== taskState.id)) })
                  }
                  for (const addId of succAdd) {
                    const target = tasks.find(t => t.id === addId)
                    if (!target) continue
                    let deps: string[] = []
                    try { deps = JSON.parse(target.dependencies || '[]') } catch { deps = [] }
                    if (!deps.includes(taskState.id)) deps = [...deps, taskState.id]
                    await onTaskUpdate(addId, { dependencies: JSON.stringify(deps) })
                  }
                  for (const s of displaySuccs) {
                    const overriddenStart = succStartOverrides[s.id]
                    if (!overriddenStart || overriddenStart === s.startDate.split('T')[0]) continue
                    const duration = new Date(s.endDate).getTime() - new Date(s.startDate).getTime()
                    const newEnd = new Date(new Date(overriddenStart).getTime() + duration).toISOString().split('T')[0]
                    await onTaskUpdate(s.id, { startDate: overriddenStart, endDate: newEnd })
                  }

                  setEditTask(null); setDepSearch(''); setSuccStartOverrides({}); setSuccAdd([]); setSuccRemove([]); setSuccSearch('')
                }

                const original = tasks.find(t => t.id === editTask!.id)

                async function checkImpactAndSave(taskState: Task) {
                  const dateChanged = original && (original.startDate !== taskState.startDate || original.endDate !== taskState.endDate)
                  if (!dateChanged) { await doSave(taskState); return }

                  setCheckingImpact(true)
                  try {
                    const res = await fetch(`/api/tasks/${taskState.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ startDate: taskState.startDate, endDate: taskState.endDate, dryRun: true })
                    })
                    const json = res.ok ? await res.json() : null
                    const affected: Task[] = (json?.updatedTasks ?? []).filter((u: Task) => u.id !== taskState.id)
                    if (affected.length === 0) { await doSave(taskState); return }
                    setExcludedFromCascade(new Set())
                    setImpactPreview({ affected, onConfirm: (excludeIds) => { setImpactPreview(null); doSave(taskState, excludeIds) } })
                  } finally {
                    setCheckingImpact(false)
                  }
                }

                // הושלם ל-100% מוקדם מהתאריך המתוכנן — לשאול אם להקדים גם את השרשרת שתלויה בה
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const completedEarly = original && original.progress < 100 && editTask!.progress === 100 && new Date(editTask!.endDate) > today

                if (completedEarly) {
                  setEarlyCompletionPrompt({
                    onYes: () => {
                      setEarlyCompletionPrompt(null)
                      const updated = { ...editTask!, endDate: today.toISOString().split('T')[0] }
                      setEditTask(updated)
                      checkImpactAndSave(updated)
                    },
                    onNo: () => { setEarlyCompletionPrompt(null); checkImpactAndSave(editTask!) },
                  })
                  return
                }

                await checkImpactAndSave(editTask!)
              }}>{checkingImpact ? 'בודק השפעה...' : 'שמור'}</button>}
            </div>
          </div>
        </div>
        )
      })()}

      {/* Procurement-only focused modal — shown instead of the full edit modal when browsing the dedicated רכש filter */}
      {procurementFocusTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setProcurementFocusTask(null)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md h-[640px] max-h-[85vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <h3 className="font-bold text-[#1F3864]">{procurementFocusTask.name}</h3>
              <button onClick={() => setProcurementFocusTask(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="mb-3">
                {procurementFocusTask.phase === 'הרכבה ק.מ חולף' && procurementFocusTask.building && procurementFocusTask.facade ? (
                  <FacadeView building={procurementFocusTask.building} facade={procurementFocusTask.facade} subStage={procurementFocusTask.subStage} canEdit={canEdit} />
                ) : (
                  <TaskImageEditor taskId={procurementFocusTask.id} canEdit={canEdit} />
                )}
              </div>
              <ProcurementPanel taskId={procurementFocusTask.id} canEdit={canEdit} />
            </div>
          </div>
        </div>
      )}

      {/* Early-completion prompt — task hit 100% before its planned end date */}
      {earlyCompletionPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center" onClick={earlyCompletionPrompt.onNo}>
          <div className="bg-white rounded-xl p-6 w-[440px] shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1F3864] mb-2">המשימה הושלמה מוקדם</h3>
            <p className="text-sm text-gray-600 mb-4">המשימה סומנה כ-100% לפני תאריך הסיום המתוכנן. להקדים גם את המשימות התלויות בה, בהתאם?</p>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={earlyCompletionPrompt.onNo}>לא, השאר תאריכים</button>
              <button className="px-4 py-2 bg-[#1F3864] text-white rounded hover:bg-blue-800" onClick={earlyCompletionPrompt.onYes}>כן, הקדם</button>
            </div>
          </div>
        </div>
      )}

      {/* Impact confirmation dialog */}
      {impactPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center" onClick={() => setImpactPreview(null)}>
          <div className="bg-white rounded-xl p-6 w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1F3864] mb-1">השינוי הזה ידחוף {impactPreview.affected.length} משימות נוספות</h3>
            <p className="text-xs text-gray-500 mb-3">בטל וי ליד משימה כדי שהיא לא תידחף</p>
            <div className="space-y-2 mb-4">
              {impactPreview.affected.map(a => {
                const excluded = excludedFromCascade.has(a.id)
                return (
                  <label key={a.id} className={`flex items-center gap-2 text-sm border rounded-lg p-2 cursor-pointer ${excluded ? 'border-gray-200 bg-gray-100 opacity-60' : 'border-gray-200 bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => setExcludedFromCascade(prev => {
                        const next = new Set(prev)
                        if (next.has(a.id)) next.delete(a.id); else next.add(a.id)
                        return next
                      })}
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${excluded ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{a.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(a.startDate).toLocaleDateString('he-IL')} — {new Date(a.endDate).toLocaleDateString('he-IL')}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => setImpactPreview(null)}>ביטול</button>
              <button className="px-4 py-2 bg-[#1F3864] text-white rounded hover:bg-blue-800" onClick={() => impactPreview.onConfirm([...excludedFromCascade])}>אשר ושמור</button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (() => {
        const predecessors = findPredecessors(tooltip.task, tasks)
        const successors   = findSuccessors(tooltip.task, tasks)
        return (
          <div className="fixed z-40 bg-gray-900 text-white text-sm rounded-lg px-3 py-2" dir="rtl"
            style={{ left: tooltip.x + 10, top: tooltip.y - 70, maxWidth: 340 }}>
            <button onClick={() => setTooltip(null)}
              className="absolute top-1 left-1.5 text-gray-400 hover:text-white text-xs leading-none">✕</button>
            <div className="font-bold text-base">{tooltip.task.name}</div>
            {(tooltip.task.stage || tooltip.task.subStage) && (
              <div className="text-blue-200 text-xs mt-0.5">
                {[
                  tooltip.task.stage ? `שלב ${tooltip.task.stage}` : null,
                  tooltip.task.subStage ? `תת ${tooltip.task.subStage}` : null,
                  tooltip.task.building ? `בניין ${tooltip.task.building}` : null,
                  tooltip.task.facade || null,
                  tooltip.task.floors ? `ק׳ ${tooltip.task.floors}` : null,
                  tooltip.task.scaffoldingNum ? `פיגום ${tooltip.task.scaffoldingNum}` : null,
                  tooltip.task.quantity != null ? `כמות ${tooltip.task.quantity} יח׳` : null,
                ].filter(Boolean).join(' | ')}
              </div>
            )}
            <div className="text-gray-300 text-xs">{tooltip.task.responsible}</div>
            <div className="text-xs mt-0.5">
              {new Date(tooltip.task.startDate).toLocaleDateString('he-IL')} — {new Date(tooltip.task.endDate).toLocaleDateString('he-IL')}
              {' '}({Math.round((new Date(tooltip.task.endDate).getTime() - new Date(tooltip.task.startDate).getTime()) / 86400000) + 1} ימים)
            </div>
            <div className="text-xs">התקדמות: {tooltip.task.progress}%</div>
            {predecessors.length > 0 && (
              <div className="mt-1.5 border-t border-gray-600 pt-1.5">
                <div className="text-blue-300 font-semibold text-xs mb-0.5">◀ מתחיל אחרי:</div>
                {predecessors.map(p => (
                  <div key={p.id} className="text-blue-100 text-xs">• {p.name}</div>
                ))}
              </div>
            )}
            {successors.length > 0 && (
              <div className="mt-1.5 border-t border-gray-600 pt-1.5">
                <div className="text-green-300 font-semibold text-xs mb-0.5">▶ מניע את:</div>
                {successors.map(s => (
                  <div key={s.id} className="text-green-100 text-xs">• {s.name}</div>
                ))}
              </div>
            )}
            {tooltip.task.notes && <div className="text-yellow-300 text-xs mt-1.5 border-t border-gray-600 pt-1.5">{tooltip.task.notes}</div>}
          </div>
        )
      })()}

      <svg width={totalWidth} height={totalHeight} style={{ display: 'block', minWidth: totalWidth }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#888" />
          </marker>
        </defs>
        <rect width={totalWidth} height={totalHeight} fill="white" />

        {/* ── Holiday background bands ── */}
        {jewishBands.map((b, i) => (
          <rect key={`jh-${i}`} x={b.x} y={HEADER_HEIGHT} width={b.width} height={totalHeight - HEADER_HEIGHT}
            fill="#E8F0FF" opacity={0.55} />
        ))}
        {muslimBands.map((b, i) => (
          <rect key={`mh-${i}`} x={b.x} y={HEADER_HEIGHT} width={b.width} height={totalHeight - HEADER_HEIGHT}
            fill="#E8F5E9" opacity={0.60} />
        ))}


        {/* ── Rows (backgrounds + bars only, no label text) ── */}
        {rows.map((row, i) => {
          const y = HEADER_HEIGHT + row.y
          if (row.type === 'phase') {
            return (
              <g key={`phase-${i}`}>
                <rect x={0} y={y} width={totalWidth} height={ROW_HEIGHT} fill="#E8E8E8" />
                {MONTHS.map((_, mi) => (
                  <line key={mi} x1={LABEL_WIDTH + mi * COL_WIDTH} y1={y} x2={LABEL_WIDTH + mi * COL_WIDTH} y2={y + ROW_HEIGHT} stroke="#CCC" strokeWidth={0.5} />
                ))}
                {weekLineXs.map((wx, wi) => (
                  <line key={wi} x1={wx} y1={y} x2={wx} y2={y + ROW_HEIGHT} stroke="#DDD" strokeWidth={0.3} />
                ))}
              </g>
            )
          }

          const task = row.task!
          const { x, width } = getBarStyle(task)
          const progressWidth = width * (task.progress / 100)
          const isOverdue = new Date(task.endDate) < new Date() && task.progress < 100
          const barColor = isOverdue ? '#C00000' : task.color
          const isSelected = selectedTaskId === task.id
          const incompletePreds = findPredecessors(task, tasks).filter(p => p.progress < 100)
          const isBlocked = incompletePreds.length > 0 && new Date(task.startDate) <= new Date()

          return (
            <g key={`task-${task.id}`}>
              <rect x={0} y={y} width={totalWidth} height={ROW_HEIGHT}
                fill={isSelected ? '#E8F0FB' : isOverdue ? '#FFF0F0' : i % 2 === 0 ? '#FAFAFA' : 'white'}
                className="cursor-pointer"
                onClick={() => setSelectedTaskId(prev => prev === task.id ? null : task.id)}
              />
              {isSelected && (
                <>
                  <line x1={LABEL_WIDTH} y1={y} x2={totalWidth} y2={y} stroke="#1F3864" strokeWidth={1.5} opacity={0.5} pointerEvents="none" />
                  <line x1={LABEL_WIDTH} y1={y + ROW_HEIGHT} x2={totalWidth} y2={y + ROW_HEIGHT} stroke="#1F3864" strokeWidth={1.5} opacity={0.5} pointerEvents="none" />
                </>
              )}
              {MONTHS.map((_, mi) => (
                <line key={mi} x1={LABEL_WIDTH + mi * COL_WIDTH} y1={y} x2={LABEL_WIDTH + mi * COL_WIDTH} y2={y + ROW_HEIGHT} stroke="#E8E8E8" strokeWidth={0.8} />
              ))}
              {weekLineXs.map((wx, wi) => (
                <line key={wi} x1={wx} y1={y} x2={wx} y2={y + ROW_HEIGHT} stroke="#F0F0F0" strokeWidth={0.5} />
              ))}
              <line x1={0} y1={y + ROW_HEIGHT} x2={totalWidth} y2={y + ROW_HEIGHT} stroke="#EEE" strokeWidth={0.5} />
              {showBaseline && baselineByTaskId[task.id] && (() => {
                const bl = baselineByTaskId[task.id]
                const { x: bx, width: bw } = getBarStyle({ startDate: bl.startDate, endDate: bl.endDate } as Task)
                return <rect x={bx} y={y + 2} width={bw} height={4} fill="#888" opacity={0.7} rx={1} pointerEvents="none" />
              })()}
              <rect x={x} y={y + 8} width={width} height={ROW_HEIGHT - 16} rx={4} fill={barColor} opacity={0.85}
                className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                onClick={() => canEdit && (procurementOnly
                  ? setProcurementFocusTask(task)
                  : (setEditTask(task), setSuccStartOverrides({}), setSuccAdd([]), setSuccRemove([]), setSuccSearch('')))}
              />
              {progressWidth > 0 && (
                <rect x={x} y={y + 8} width={progressWidth} height={ROW_HEIGHT - 16} rx={4} fill={barColor} opacity={1} pointerEvents="none" />
              )}
              {task.progress > 0 && task.progress < 100 && (
                <line x1={x + progressWidth} y1={y + 6} x2={x + progressWidth} y2={y + ROW_HEIGHT - 6} stroke="white" strokeWidth={2} />
              )}
              {isOverdue && (
                <text x={x + width + 4} y={y + ROW_HEIGHT / 2 + 4} fontSize={13} pointerEvents="none">⚠️</text>
              )}
              {isBlocked && (
                <text x={x - 16} y={y + ROW_HEIGHT / 2 + 4} fontSize={12}>🔒<title>{`חסום — מחכה ל: ${incompletePreds.map(p => p.name).join(', ')}`}</title></text>
              )}
              {/* שלד — 10 קומות שוות */}
              {task.phase === 'שלד' && (() => {
                const FLOORS = 10
                const sd = new Date(task.startDate)
                const ed = new Date(task.endDate)
                const totalMs = ed.getTime() - sd.getTime()
                const today = new Date()
                return Array.from({ length: FLOORS }, (_, fi) => {
                  const floorStart = new Date(sd.getTime() + (fi / FLOORS) * totalMs)
                  const floorEnd   = new Date(sd.getTime() + ((fi + 1) / FLOORS) * totalMs)
                  const fx  = dateToX(floorStart)
                  const fex = dateToX(floorEnd)
                  const segW = fex - fx
                  const isCurrent = today >= floorStart && today < floorEnd
                  const isInstallStart = fi === 5
                  return (
                    <g key={`skel-f-${fi}`} pointerEvents="none">
                      {fi > 0 && (
                        <line x1={fx} y1={y + 8} x2={fx} y2={y + ROW_HEIGHT - 8}
                          stroke="rgba(255,255,255,0.75)" strokeWidth={isInstallStart ? 2 : 1} />
                      )}
                      {isCurrent && (
                        <rect x={fx} y={y + 8} width={segW} height={ROW_HEIGHT - 16}
                          fill="rgba(255,220,0,0.25)" rx={2} />
                      )}
                      <text x={fx + segW / 2} y={y + ROW_HEIGHT / 2 + 4}
                        textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize={9} fontFamily="Arial" fontWeight="bold">
                        {`ק׳ ${fi + 1}`}
                      </text>
                      {isInstallStart && (
                        <>
                          <polygon points={`${fx},${y + ROW_HEIGHT - 6} ${fx - 5},${y + ROW_HEIGHT + 1} ${fx + 5},${y + ROW_HEIGHT + 1}`}
                            fill="#FFD700" />
                          <text x={fx} y={y + ROW_HEIGHT + 10} textAnchor="middle"
                            fill="#FFD700" fontSize={7} fontFamily="Arial" fontWeight="bold">B▶</text>
                        </>
                      )}
                    </g>
                  )
                })
              })()}
              {/* תאריך התחלה — מחוץ לבר משמאל */}
              {(() => {
                const sd = new Date(task.startDate)
                const ed = new Date(task.endDate)
                const startLabel = `${sd.getDate()}/${sd.getMonth() + 1}`
                const endLabel   = `${ed.getDate()}/${ed.getMonth() + 1}`
                const midY = y + ROW_HEIGHT / 2 + 4
                return (
                  <>
                    <text x={x - 3} y={midY} textAnchor="end" fill="#333" fontSize={8} fontFamily="Arial" pointerEvents="none">{startLabel}</text>
                    <text x={x + width + 3} y={midY} textAnchor="start" fill="#333" fontSize={8} fontFamily="Arial" pointerEvents="none">{endLabel}</text>
                  </>
                )
              })()}
            </g>
          )
        })}

        {/* ── Dependency arrows ── */}
        {tasks.flatMap(task => {
          let deps: string[] = []
          try { deps = JSON.parse(task.dependencies || '[]') } catch { deps = [] }
          return deps.flatMap((depId, di) => {
            const from = taskBarPos[depId]
            const to   = taskBarPos[task.id]
            if (!from || !to) return []
            const x1 = from.x + from.width
            const y1 = from.midY
            const x2 = to.x
            const y2 = to.midY
            const cx1 = x1 + Math.min(40, Math.abs(x2 - x1) * 0.4)
            const cx2 = x2 - Math.min(40, Math.abs(x2 - x1) * 0.4)
            return [
              <path key={`dep-${task.id}-${depId}-${di}`}
                d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                fill="none" stroke="#888" strokeWidth={1} strokeDasharray="4,3"
                markerEnd="url(#arrow)" opacity={0.6} pointerEvents="none"
              />
            ]
          })
        })}

        {/* Today marker */}
        {(() => {
          const projectStart = MONTHS[0]
          const projectEnd   = addMonths(MONTHS[MONTHS.length - 1], 1)
          const totalDays    = differenceInDays(projectEnd, projectStart)
          const todayOffset  = differenceInDays(new Date(), projectStart)
          if (todayOffset < 0 || todayOffset > totalDays) return null
          const tx = LABEL_WIDTH + (todayOffset / totalDays) * (MONTHS.length * COL_WIDTH)
          return (
            <g>
              <line x1={tx} y1={HEADER_HEIGHT} x2={tx} y2={totalHeight} stroke="#FF4444" strokeWidth={2} strokeDasharray="4,3" />
              <g ref={todayLabelRef}>
                <rect x={tx - 20} y={HEADER_HEIGHT + 4} width={40} height={16} rx={3} fill="#FF4444" />
                <text x={tx} y={HEADER_HEIGHT + 16} textAnchor="middle" fill="white" fontSize={9} fontFamily="Arial">היום</text>
              </g>
            </g>
          )
        })()}

        {/* ── 1. Sticky timeline header (vertical sticky only) ── */}
        <g ref={timelineHRef}>
          <rect x={LABEL_WIDTH} y={0} width={totalWidth - LABEL_WIDTH} height={HEADER_HEIGHT} fill="white" />
          {jewishBands.map((b, i) => (
            <rect key={`jhh-${i}`} x={b.x} y={YEAR_H + MONTH_H} width={b.width} height={WEEK_H} fill="#4472C4" opacity={0.35} />
          ))}
          {muslimBands.map((b, i) => (
            <rect key={`mhh-${i}`} x={b.x} y={YEAR_H + MONTH_H} width={b.width} height={WEEK_H} fill="#2E7D32" opacity={0.40} />
          ))}
          {years.map(year => {
            const yearMonths = MONTHS.filter(m => m.getFullYear() === year)
            if (!yearMonths.length) return null
            const startIdx = MONTHS.findIndex(m => m.getFullYear() === year)
            const x = LABEL_WIDTH + startIdx * COL_WIDTH
            const w = yearMonths.length * COL_WIDTH
            return (
              <g key={year}>
                <rect x={x} y={0} width={w} height={YEAR_H} fill="#111111" />
                <text x={x + w / 2} y={17} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold" fontFamily="Arial">{year}</text>
              </g>
            )
          })}
          {MONTHS.map((month, i) => (
            <g key={i}>
              <rect x={LABEL_WIDTH + i * COL_WIDTH} y={YEAR_H} width={COL_WIDTH} height={MONTH_H}
                fill={i % 2 === 0 ? '#2a2a2a' : '#1a1a1a'} />
              <text x={LABEL_WIDTH + i * COL_WIDTH + COL_WIDTH / 2} y={YEAR_H + 16}
                textAnchor="middle" fill="white" fontSize={10} fontFamily="Arial">
                {HEB_MONTHS[month.getMonth()].slice(0, 3)}
              </text>
            </g>
          ))}
          {WEEK_MONDAYS.map((monday, i) => {
            const x = dateToX(monday)
            const nextMonday = WEEK_MONDAYS[i + 1] ?? new Date(monday.getTime() + 7 * 86400000)
            const w = dateToX(nextMonday) - x
            if (w <= 0) return null
            const jan1 = new Date(monday.getFullYear(), 0, 1)
            const weekNum = Math.floor((monday.getTime() - jan1.getTime()) / (7 * 86400000)) + 1
            return (
              <g key={`wk-${i}`}>
                <rect x={x} y={YEAR_H + MONTH_H} width={w} height={WEEK_H} fill={i % 2 === 0 ? '#444444' : '#3a3a3a'} />
                <line x1={x} y1={YEAR_H + MONTH_H} x2={x} y2={HEADER_HEIGHT} stroke="#666" strokeWidth={0.7} />
                <text x={x + w / 2} y={YEAR_H + MONTH_H + 15} textAnchor="middle" fill="#ddd" fontSize={8} fontFamily="Arial">{weekNum}</text>
              </g>
            )
          })}
        </g>

        {/* ── 2. Sticky labels column (horizontal sticky only) ── */}
        <g ref={labelsColRef}>
          {(() => {
            return rows.map((row, i) => {
            const y = HEADER_HEIGHT + row.y
            if (row.type === 'phase') {
              return (
                <g key={`lbl-ph-${i}`}>
                  <rect x={0} y={y} width={LABEL_WIDTH} height={ROW_HEIGHT} fill="#E8E8E8" />
                  <rect x={0} y={y} width={6} height={ROW_HEIGHT} fill={row.color || '#1F3864'} />
                  <text x={16} y={y + ROW_HEIGHT / 2 + 5} fill="#1F3864" fontSize={13} fontWeight="bold" fontFamily="Arial">{row.label}</text>
                </g>
              )
            }
            const task = row.task!
            const num = taskSerialNumbers?.[task.id] ?? ''
            const labelOverdue = new Date(task.endDate) < new Date() && task.progress < 100
            const isLabelSelected = selectedTaskId === task.id
            return (
              <g key={`lbl-tk-${task.id}`}>
                <rect x={0} y={y} width={LABEL_WIDTH} height={ROW_HEIGHT}
                  fill={isLabelSelected ? '#E8F0FB' : labelOverdue ? '#FFF0F0' : i % 2 === 0 ? '#FAFAFA' : 'white'}
                  className="cursor-pointer"
                  onClick={() => setSelectedTaskId(prev => prev === task.id ? null : task.id)}
                />
                {isLabelSelected
                  ? <rect x={0} y={y} width={5} height={ROW_HEIGHT} fill="#1F3864" />
                  : labelOverdue && <rect x={0} y={y} width={4} height={ROW_HEIGHT} fill="#C00000" />
                }
                <text x={30} y={y + 16} fill={labelOverdue ? '#C00000' : '#999'} fontSize={10} fontFamily="Arial" fontWeight="bold">{num}</text>
                <text
                  x={12} y={y + 17} fontSize={15} fill="#1F78C1" fontWeight="bold" fontFamily="Arial" textAnchor="middle"
                  className="cursor-pointer"
                  onClick={e => { e.stopPropagation(); setTooltip(prev => prev?.task.id === task.id ? null : { task, x: e.clientX, y: e.clientY }) }}
                >ⓘ</text>
                <text x={58} y={y + 16} fill={labelOverdue ? '#C00000' : '#222'} fontSize={14} fontWeight="600" fontFamily="Arial">{task.name}</text>
                {(task.stage || task.subStage || task.building) ? (
                  <>
                    <text x={20} y={y + 28} fill="#145a8c" fontSize={10} fontFamily="Arial">
                      {[
                        task.stage ? `שלב ${task.stage}` : null,
                        task.subStage ? `תת ${task.subStage}` : null,
                        task.building ? `בניין ${task.building}` : null,
                        task.facade || null,
                        task.floors ? `ק׳ ${task.floors}` : null,
                        task.cost != null ? `₪${task.cost.toLocaleString('he-IL')}` : null,
                      ].filter(Boolean).join(' | ')}
                    </text>
                    <text x={20} y={y + 41} fill="#555" fontSize={10} fontFamily="Arial">
                      {task.phase === 'חלוקת פיגומים'
                        ? (task.notes || '')
                        : [
                            task.scaffoldingNum ? `פיגום ${task.scaffoldingNum}` : null,
                            task.quantity != null ? `כמות ${task.quantity} יח׳` : null,
                            task.responsible || null,
                          ].filter(Boolean).join(' | ')}
                    </text>
                  </>
                ) : (() => {
                  const preds = findPredecessors(task, tasks)
                  return (
                    <>
                      <text x={20} y={y + 28} fill="#555" fontSize={10} fontFamily="Arial">{task.responsible}</text>
                      {preds.length > 0 && (
                        <text x={20} y={y + 41} fill="#145a8c" fontSize={9} fontFamily="Arial">
                          {`▶ ${preds.map(p => p.name).join(' + ')}`}
                        </text>
                      )}
                    </>
                  )
                })()}
              </g>
            )
          })
          })()}
        </g>

        {/* ── 3. Sticky corner — top-left box (both axes) ── */}
        <g ref={cornerRef}>
          <rect x={0} y={0} width={LABEL_WIDTH} height={HEADER_HEIGHT} fill="#111111" />
          <text x={LABEL_WIDTH / 2} y={HEADER_HEIGHT / 2 + 1} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold" fontFamily="Arial">
            פרויקט טרמינל סנטר 3 — לוח זמנים
          </text>
          <text x={8} y={HEADER_HEIGHT - 14} fill="#AAD4FF" fontSize={9} fontFamily="Arial" fontWeight="bold">מס׳</text>
          <text x={28} y={HEADER_HEIGHT - 14} fill="#AAD4FF" fontSize={9} fontFamily="Arial" fontWeight="bold">שם משימה</text>
          <line x1={0} y1={HEADER_HEIGHT - 8} x2={LABEL_WIDTH} y2={HEADER_HEIGHT - 8} stroke="#AAD4FF" strokeOpacity={0.3} strokeWidth={0.5} />
        </g>

        {/* ── 4. Bar click-capture layer — on top of sticky groups so bars are always clickable ── */}
        {rows.map((row) => {
          if (row.type !== 'task' || !row.task) return null
          const task = row.task
          const { x: bx, width: bw } = getBarStyle(task)
          const by = HEADER_HEIGHT + row.y
          return (
            <rect key={`bar-click-${task.id}`}
              x={bx} y={by + 8} width={bw} height={ROW_HEIGHT - 16} rx={4}
              fill="transparent"
              pointerEvents="all"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (procurementOnly) {
                  setProcurementFocusTask(task)
                } else {
                  setEditTask(task)
                  setSuccStartOverrides({})
                  setSuccAdd([])
                  setSuccRemove([])
                  setSuccSearch('')
                }
              }}
            />
          )
        })}
      </svg>
      {/* Legend */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA', display: 'flex', gap: 20, alignItems: 'center', direction: 'rtl' }}>
        <span style={{ fontSize: 11, color: '#666' }}>אגדה:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#333' }}>
          <span style={{ display: 'inline-block', width: 16, height: 12, background: '#E8F0FF', border: '1px solid #4472C4', borderRadius: 2 }} />
          חגים יהודיים
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#333' }}>
          <span style={{ display: 'inline-block', width: 16, height: 12, background: '#E8F5E9', border: '1px solid #2E7D32', borderRadius: 2 }} />
          חגים מוסלמיים (עיד)
        </span>
        {Object.keys(baselineByTaskId).length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#333', cursor: 'pointer' }}>
            <input type="checkbox" checked={showBaseline} onChange={e => setShowBaseline(e.target.checked)} />
            <span style={{ display: 'inline-block', width: 16, height: 4, background: '#888', borderRadius: 1 }} />
            בייסליין (תוכנית מקורית)
          </label>
        )}
      </div>
    </div>
  )
}
