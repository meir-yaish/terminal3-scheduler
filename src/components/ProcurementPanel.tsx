'use client'
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'

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

const STATUS_OPTIONS = ['ממתין', 'הוזמן', 'סופק', 'התקבל באתר']
const STATUS_COLORS: Record<string, string> = {
  'ממתין': '#999999',
  'הוזמן': '#E6A700',
  'סופק': '#2E75B6',
  'התקבל באתר': '#00B050',
}

export interface ProcurementPanelHandle {
  /** Submits whatever is currently typed in the "add item" form, if a name was entered.
   *  Called by the parent's own save button so a filled-but-not-yet-submitted item is
   *  never silently lost when the task edit modal closes. */
  flushPendingItem: () => Promise<void>
}

const ProcurementPanel = forwardRef<ProcurementPanelHandle, { taskId: string; canEdit: boolean }>(function ProcurementPanel({ taskId, canEdit }, ref) {
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', sku: '', quantity: '', unit: '', neededByDate: '', notes: '' })

  async function load() {
    const res = await fetch(`/api/procurement?taskId=${taskId}`)
    setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitNewItem(current: typeof newItem) {
    if (!current.name.trim()) return
    await fetch('/api/procurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        name: current.name.trim(),
        sku: current.sku.trim() || null,
        quantity: current.quantity.trim() === '' ? null : parseFloat(current.quantity),
        unit: current.unit || null,
        neededByDate: current.neededByDate || null,
        notes: current.notes || null,
      }),
    })
    setNewItem({ name: '', sku: '', quantity: '', unit: '', neededByDate: '', notes: '' })
    setShowAdd(false)
    await load()
  }

  async function addItem() {
    await submitNewItem(newItem)
  }

  useImperativeHandle(ref, () => ({
    flushPendingItem: () => submitNewItem(newItem),
  }), [newItem, taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(item: ProcurementItem, status: string) {
    if (!canEdit || status === item.status) return
    await fetch(`/api/procurement/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  async function setNeededByDate(item: ProcurementItem, neededByDate: string) {
    if (!canEdit) return
    await fetch(`/api/procurement/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ neededByDate: neededByDate || null }) })
    await load()
  }

  async function deleteItem(id: string) {
    await fetch(`/api/procurement/${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading) return <div className="text-xs text-gray-400">טוען רכש...</div>

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">🛒 רכש להתקנה זו</span>
        {canEdit && (
          <button onClick={() => setShowAdd(v => !v)} className="text-xs px-2 py-1 bg-[#1F3864] text-white rounded">+ פריט</button>
        )}
      </div>
      {showAdd && (
        <div className="mb-2 p-2 bg-gray-50 rounded border flex flex-wrap gap-1">
          <input placeholder="שם פריט" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="border rounded px-2 py-1 text-xs flex-1 min-w-[100px]" />
          <input placeholder="מק״ט" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} className="border rounded px-2 py-1 text-xs w-20" />
          <input type="number" placeholder="כמות" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="border rounded px-2 py-1 text-xs w-16" />
          <input placeholder="יח'" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="border rounded px-2 py-1 text-xs w-16" />
          <input type="date" value={newItem.neededByDate} onChange={e => setNewItem({ ...newItem, neededByDate: e.target.value })} className="border rounded px-2 py-1 text-xs" />
          <input placeholder="הערות" value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} className="border rounded px-2 py-1 text-xs flex-1 min-w-[80px]" />
          <button onClick={addItem} className="text-xs px-2 py-1 bg-[#00B050] text-white rounded">הוסף</button>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-xs text-gray-400">אין פריטי רכש עדיין</div>
      ) : (
        <div className="space-y-1">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between text-xs bg-white border rounded px-2 py-1.5 gap-2">
              <div className="flex-1">
                <span className="font-medium">{it.name}</span>
                {it.sku && <span className="text-gray-400 mr-1">מק״ט {it.sku}</span>}
                {it.quantity != null && <span className="text-gray-400 mr-1">{it.quantity}{it.unit ? ' ' + it.unit : ''}</span>}
                {it.notes && <span className="text-gray-400 mr-1">| {it.notes}</span>}
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-gray-400">יעד:</span>
                <input type="date" value={it.neededByDate ? it.neededByDate.slice(0, 10) : ''} onChange={e => setNeededByDate(it, e.target.value)} disabled={!canEdit}
                  className="border rounded px-1 py-0.5 text-xs text-gray-600" />
                <select value={it.status} onChange={e => setStatus(it, e.target.value)} disabled={!canEdit}
                  className="rounded-full text-white text-center"
                  style={{ padding: '2px 20px 2px 8px', border: 'none', background: STATUS_COLORS[it.status] || '#999', appearance: 'none', WebkitAppearance: 'none', textAlignLast: 'center' }}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s} style={{ color: '#333', background: 'white' }}>{s}</option>
                  ))}
                </select>
                {canEdit && <button onClick={() => deleteItem(it.id)} className="text-red-600 px-1">✕</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default ProcurementPanel
