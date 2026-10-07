'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ProcurementItem {
  id: string
  taskId: string
  name: string
  sku?: string | null
  quantity?: number | null
  unit?: string | null
  neededByDate?: string | null
  notes?: string | null
  status: string
}

interface Task {
  id: string
  name: string
  phase: string
}

const STATUS_OPTIONS = ['ממתין', 'הוזמן', 'סופק', 'התקבל באתר']
const STATUS_COLORS: Record<string, string> = {
  'ממתין': '#999999',
  'הוזמן': '#E6A700',
  'סופק': '#2E75B6',
  'התקבל באתר': '#00B050',
}

export default function ProcurementDashboard() {
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  async function load() {
    const pid = localStorage.getItem('projectId')
    if (!pid) { setLoading(false); return }
    const [itemsRes, tasksRes] = await Promise.all([
      fetch(`/api/procurement?projectId=${pid}`),
      fetch(`/api/tasks?projectId=${pid}`),
    ])
    setItems(await itemsRes.json())
    setTasks(await tasksRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function setStatus(item: ProcurementItem, status: string) {
    if (status === item.status) return
    await fetch(`/api/procurement/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  if (loading) return <div style={{ padding: 40, fontFamily: 'Arial', direction: 'rtl' }}>טוען...</div>

  const taskById = Object.fromEntries(tasks.map(t => [t.id, t]))
  const filtered = statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter)
  const sorted = [...filtered].sort((a, b) => {
    const da = a.neededByDate ? new Date(a.neededByDate).getTime() : Infinity
    const db = b.neededByDate ? new Date(b.neededByDate).getTime() : Infinity
    return da - db
  })
  const counts = STATUS_OPTIONS.map(s => ({ status: s, count: items.filter(i => i.status === s).length }))

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', background: '#EFF2F5', minHeight: '100vh' }}>
      <div style={{ background: '#111', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#9DC3E6', fontSize: 14, textDecoration: 'none' }}>← חזרה ללוח הזמנים</Link>
        <span style={{ color: 'white', fontWeight: 700 }}>🛒 מערכת רכש</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setStatusFilter('all')}
            style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${statusFilter === 'all' ? '#1F3864' : '#D1D5DB'}`, background: statusFilter === 'all' ? '#1F3864' : 'white', color: statusFilter === 'all' ? 'white' : '#444', fontSize: 13, cursor: 'pointer' }}>
            הכל ({items.length})
          </button>
          {counts.map(c => (
            <button key={c.status} onClick={() => setStatusFilter(c.status)}
              style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${statusFilter === c.status ? STATUS_COLORS[c.status] : '#D1D5DB'}`, background: statusFilter === c.status ? STATUS_COLORS[c.status] : 'white', color: statusFilter === c.status ? 'white' : '#444', fontSize: 13, cursor: 'pointer' }}>
              {c.status} ({c.count})
            </button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1F3864', color: 'white' }}>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>פריט</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>מק״ט</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>שייך למשימה</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>כמות</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>נדרש באתר</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>הערות</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#999' }}>אין פריטי רכש</td></tr>
              )}
              {sorted.map(it => {
                const task = taskById[it.taskId]
                const overdue = it.neededByDate && new Date(it.neededByDate) < new Date() && it.status !== 'התקבל באתר'
                return (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f0f0f0', background: overdue ? '#FFF5F5' : 'white' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.name}</td>
                    <td style={{ padding: '8px 12px', color: '#555' }}>{it.sku}</td>
                    <td style={{ padding: '8px 12px', color: '#555' }}>{task ? task.name : it.taskId}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.quantity ?? ''}{it.unit ? ' ' + it.unit : ''}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: overdue ? '#C00000' : '#555' }}>
                      {it.neededByDate ? new Date(it.neededByDate).toLocaleDateString('he-IL') : ''}
                      {overdue && ' ⚠️'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: 12 }}>{it.notes}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <select value={it.status} onChange={e => setStatus(it, e.target.value)}
                        style={{ padding: '4px 20px 4px 8px', borderRadius: 20, color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, background: STATUS_COLORS[it.status], appearance: 'none', WebkitAppearance: 'none', textAlign: 'center', textAlignLast: 'center' }}>
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s} style={{ color: '#333', background: 'white' }}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
