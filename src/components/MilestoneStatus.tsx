'use client'
import { useState } from 'react'

interface Milestone {
  id: string
  name: string
  date: string
  status: string
  notes?: string | null
}

interface Task {
  id?: string
  name: string
  phase: string
  cost?: number | null
  startDate?: string
  endDate?: string
  progress?: number
}

export default function MilestoneStatus({ milestones, onStatusChange, onUpdate, onAdd, onDelete, tasks = [], canEdit = false, criticalTasks = [], criticalFilterLabel = 'הכל', onTaskUpdate, onTaskDelete }: {
  milestones: Milestone[]
  onStatusChange: (id: string, status: string) => void
  onUpdate?: (id: string, data: Partial<Milestone>) => void
  onAdd?: (data: { name: string; date: string; notes?: string }) => void
  onDelete?: (id: string) => void
  tasks?: Task[]
  canEdit?: boolean
  criticalTasks?: Task[]
  criticalFilterLabel?: string
  onTaskUpdate?: (id: string, data: Partial<Task>) => void
  onTaskDelete?: (id: string) => void
}) {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ name: string; date: string; notes: string }>({ name: '', date: '', notes: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ name: '', date: '', notes: '' })
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskData, setEditTaskData] = useState<{ name: string; startDate: string; endDate: string }>({ name: '', startDate: '', endDate: '' })

  function startTaskEdit(t: Task) {
    if (!t.id) return
    setEditingTaskId(t.id)
    setEditTaskData({ name: t.name, startDate: (t.startDate ?? '').split('T')[0], endDate: (t.endDate ?? '').split('T')[0] })
  }

  function saveTaskEdit() {
    if (editingTaskId && onTaskUpdate) {
      onTaskUpdate(editingTaskId, { name: editTaskData.name, startDate: editTaskData.startDate, endDate: editTaskData.endDate })
    }
    setEditingTaskId(null)
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id)
    setEditData({ name: m.name, date: m.date.split('T')[0], notes: m.notes || '' })
  }

  function saveEdit() {
    if (editingId && onUpdate) {
      onUpdate(editingId, { name: editData.name, date: editData.date, notes: editData.notes || null })
    }
    setEditingId(null)
  }

  function submitAdd() {
    if (!newMilestone.name.trim() || !newMilestone.date || !onAdd) return
    onAdd({ name: newMilestone.name.trim(), date: newMilestone.date, notes: newMilestone.notes || undefined })
    setNewMilestone({ name: '', date: '', notes: '' })
    setShowAdd(false)
  }
  const STATUS_CONFIG = {
    green: { label: '✅ בזמן', bg: '#E8F5E9', border: '#00B050', text: '#00B050' },
    yellow: { label: '⚠️ בסיכון', bg: '#FFF8E1', border: '#FFC000', text: '#E65100' },
    red: { label: '🔴 חריגה', bg: '#FFEBEE', border: '#C00000', text: '#C00000' },
  }

  const taskNameSuggestions = [...new Set(tasks.map(t => t.name).filter(Boolean))]

  const costByPhase: Record<string, number> = {}
  for (const t of tasks) {
    if (t.cost == null) continue
    costByPhase[t.phase] = (costByPhase[t.phase] || 0) + t.cost
  }
  const isRevenue = (phase: string) => phase.startsWith('הכנסות')
  const allEntries = Object.entries(costByPhase).sort((a, b) => b[1] - a[1])
  const expenseEntries = allEntries.filter(([phase]) => !isRevenue(phase))
  const totalExpense = expenseEntries.reduce((sum, [, v]) => sum + v, 0)

  const sortedCritical = [...criticalTasks].sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime())

  return (
    <div dir="rtl" className="overflow-y-auto flex-1 min-h-0">
      {sortedCritical.length > 0 && (
        <div className="mb-5">
          <div className="text-sm font-bold text-gray-700 mb-2">🎯 משימות קריטיות — {criticalFilterLabel}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedCritical.map(t => {
              const isTaskEditing = t.id && editingTaskId === t.id
              const isDone = (t.progress ?? 0) >= 100

              if (isTaskEditing) {
                return (
                  <div key={t.id} className="rounded-lg border-2 p-4" style={{ background: '#F5F8FF', borderColor: '#1F3864' }}>
                    <div className="flex flex-col gap-2 mb-2">
                      <input className="border rounded px-2 py-1 text-sm" value={editTaskData.name}
                        onChange={e => setEditTaskData({ ...editTaskData, name: e.target.value })} />
                      <input type="date" className="border rounded px-2 py-1 text-sm" value={editTaskData.startDate}
                        onChange={e => setEditTaskData({ ...editTaskData, startDate: e.target.value })} />
                      <input type="date" className="border rounded px-2 py-1 text-sm" value={editTaskData.endDate}
                        onChange={e => setEditTaskData({ ...editTaskData, endDate: e.target.value })} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingTaskId(null)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs">ביטול</button>
                      <button onClick={saveTaskEdit} className="px-3 py-1 bg-[#00B050] text-white rounded text-xs">שמור</button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={t.id ?? t.name} className="rounded-lg border-2 p-4" style={{ background: isDone ? '#E8F5E9' : '#FFF5F5', borderColor: isDone ? '#00B050' : '#C00000' }}>
                  <div className="font-bold text-gray-800 text-sm leading-tight mb-1">{t.name}</div>
                  <div className="text-xs text-gray-400 mb-2">{t.phase}</div>
                  {t.startDate && t.endDate && (
                    <div className="text-xs text-gray-500 mb-2">
                      📅 {new Date(t.startDate).toLocaleDateString('he-IL')} — {new Date(t.endDate).toLocaleDateString('he-IL')}
                      {isDone && <span className="mr-2 text-green-600">✓ הושלם</span>}
                    </div>
                  )}
                  {canEdit && t.id && (
                    <div className="flex gap-1 mt-2">
                      {onTaskUpdate && (
                        <button onClick={() => onTaskUpdate(t.id!, { progress: isDone ? 0 : 100 })}
                          className="flex-1 py-1 rounded text-xs font-medium"
                          style={{ background: isDone ? '#F0F0F0' : '#E8F5E9', color: isDone ? '#666' : '#00B050' }}>
                          {isDone ? 'בטל השלמה' : '✓ בוצע'}
                        </button>
                      )}
                      {onTaskUpdate && (
                        <button onClick={() => startTaskEdit(t)}
                          className="flex-1 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">ערוך</button>
                      )}
                      {onTaskDelete && (
                        <button onClick={() => onTaskDelete(t.id!)}
                          className="flex-1 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100">מחק</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {expenseEntries.length > 0 && (
        <div className="mb-5 rounded-lg border border-gray-200 shadow-sm bg-white overflow-hidden">
          <div className="px-4 py-2.5 flex justify-between items-center" style={{ background: '#1F3864' }}>
            <span className="text-white font-bold text-sm">💰 סיכום הוצאות</span>
            <span className="text-white font-bold text-sm">₪{totalExpense.toLocaleString('he-IL')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: '#E5E7EB' }}>
            {expenseEntries.map(([phase, cost]) => (
              <div key={phase} className="bg-white px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">{phase}</div>
                <div className="font-bold text-[#1F3864]">₪{cost.toLocaleString('he-IL')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {canEdit && (
        <div className="mb-3">
          {showAdd ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 bg-gray-50">
              <div className="flex flex-wrap gap-2 mb-2">
                <input className="border rounded px-2 py-1 text-sm flex-1 min-w-[160px]" placeholder="שם אבן דרך" list="milestone-name-suggestions"
                  value={newMilestone.name} onChange={e => setNewMilestone({ ...newMilestone, name: e.target.value })} />
                <datalist id="milestone-name-suggestions">
                  {taskNameSuggestions.map(n => <option key={n} value={n} />)}
                </datalist>
                <input type="date" className="border rounded px-2 py-1 text-sm"
                  value={newMilestone.date} onChange={e => setNewMilestone({ ...newMilestone, date: e.target.value })} />
                <input className="border rounded px-2 py-1 text-sm flex-1 min-w-[120px]" placeholder="הערות"
                  value={newMilestone.notes} onChange={e => setNewMilestone({ ...newMilestone, notes: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAdd(false)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs">ביטול</button>
                <button onClick={submitAdd} className="px-3 py-1 bg-[#1F3864] text-white rounded text-xs">הוסף</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-[#00B050] text-white rounded-lg text-sm font-medium hover:opacity-90">
              ➕ הוסף אבן דרך
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {milestones.map(m => {
        const config = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.green
        const isPast = new Date(m.date) < new Date()
        const isSelected = selectedMilestoneId === m.id
        const isEditing = editingId === m.id

        if (isEditing) {
          return (
            <div key={m.id} className="rounded-lg border-2 p-4" style={{ background: '#F5F8FF', borderColor: '#1F3864' }}>
              <div className="flex flex-col gap-2 mb-2">
                <input className="border rounded px-2 py-1 text-sm" value={editData.name} list="milestone-name-suggestions"
                  onChange={e => setEditData({ ...editData, name: e.target.value })} />
                <input type="date" className="border rounded px-2 py-1 text-sm" value={editData.date}
                  onChange={e => setEditData({ ...editData, date: e.target.value })} />
                <input className="border rounded px-2 py-1 text-sm" placeholder="הערות" value={editData.notes}
                  onChange={e => setEditData({ ...editData, notes: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs">ביטול</button>
                <button onClick={saveEdit} className="px-3 py-1 bg-[#00B050] text-white rounded text-xs">שמור</button>
              </div>
            </div>
          )
        }

        return (
          <div key={m.id} className="rounded-lg border-2 p-4 transition-all cursor-pointer"
            onClick={() => setSelectedMilestoneId(prev => prev === m.id ? null : m.id)}
            style={{ background: config.bg, borderColor: config.border, boxShadow: isSelected ? '0 0 0 3px #1F3864' : 'none' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-gray-800 text-sm leading-tight">{m.name}</span>
              <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: config.border, color: 'white' }}>
                {config.label}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-3">
              📅 {new Date(m.date).toLocaleDateString('he-IL')}
              {isPast && m.status === 'green' && <span className="mr-2 text-green-600">✓ הושלם</span>}
            </div>
            <div className="flex gap-1 mb-2">
              {(['green', 'yellow', 'red'] as const).map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); onStatusChange(m.id, s) }}
                  className="flex-1 py-1 rounded text-xs font-medium transition-all"
                  style={{
                    background: m.status === s ? STATUS_CONFIG[s].border : '#F0F0F0',
                    color: m.status === s ? 'white' : '#666'
                  }}>
                  {s === 'green' ? 'בזמן' : s === 'yellow' ? 'בסיכון' : 'חריגה'}
                </button>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <button onClick={e => { e.stopPropagation(); startEdit(m) }}
                  className="flex-1 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">ערוך</button>
                {onDelete && (
                  <button onClick={e => { e.stopPropagation(); onDelete(m.id) }}
                    className="flex-1 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100">מחק</button>
                )}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}
