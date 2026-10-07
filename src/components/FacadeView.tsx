'use client'
import { useEffect, useRef, useState } from 'react'
import { getFacadeImage } from '@/lib/facadeImages'

interface Region { xPct: number; yPct: number; wPct: number; hPct: number }

export default function FacadeView({ building, facade, subStage, canEdit }: { building?: string | null; facade?: string | null; subStage?: string | null; canEdit: boolean }) {
  const def = getFacadeImage(building, facade)
  const [regions, setRegions] = useState<Record<string, Region>>({})
  const [loading, setLoading] = useState(true)
  const imgWrapRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!def) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/facade-regions?key=${encodeURIComponent(def.key)}`).then(r => r.json()).then((rows: any[]) => {
      if (cancelled) return
      const map: Record<string, Region> = {}
      for (const r of rows) map[r.code] = { xPct: r.xPct, yPct: r.yPct, wPct: r.wPct, hPct: r.hPct }
      setRegions(map)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [def?.key])

  if (!def) return null
  if (loading) return <div className="text-xs text-gray-400">טוען תמונה...</div>

  const region = subStage ? regions[subStage] : null

  function pctFromEvent(clientX: number, clientY: number) {
    const rect = imgWrapRef.current!.getBoundingClientRect()
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    return { x: xPct, y: yPct }
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!canEdit || !subStage) return
    e.preventDefault()
    const p = pctFromEvent(e.clientX, e.clientY)
    setDragStart(p)
    setDragCurrent(p)
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart) return
    setDragCurrent(pctFromEvent(e.clientX, e.clientY))
  }
  async function onMouseUp() {
    if (!dragStart || !dragCurrent || !subStage) return
    const xPct = Math.min(dragStart.x, dragCurrent.x)
    const yPct = Math.min(dragStart.y, dragCurrent.y)
    const wPct = Math.abs(dragCurrent.x - dragStart.x)
    const hPct = Math.abs(dragCurrent.y - dragStart.y)
    setDragStart(null)
    setDragCurrent(null)
    if (wPct < 1 || hPct < 1) return
    const newRegion = { xPct, yPct, wPct, hPct }
    setRegions(prev => ({ ...prev, [subStage]: newRegion }))
    await fetch('/api/facade-regions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: def!.key, code: subStage, ...newRegion }),
    })
  }

  async function clearRegion() {
    if (!subStage) return
    setRegions(prev => { const next = { ...prev }; delete next[subStage]; return next })
    await fetch(`/api/facade-regions?key=${encodeURIComponent(def!.key)}&code=${encodeURIComponent(subStage)}`, { method: 'DELETE' })
  }

  const liveBox = dragStart && dragCurrent ? {
    xPct: Math.min(dragStart.x, dragCurrent.x),
    yPct: Math.min(dragStart.y, dragCurrent.y),
    wPct: Math.abs(dragCurrent.x - dragStart.x),
    hPct: Math.abs(dragCurrent.y - dragStart.y),
  } : null

  const shownBox = liveBox ?? region

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-500">{def.label}{subStage ? ` — ${subStage}` : ''}</span>
        <div className="flex items-center gap-2">
          {canEdit && subStage && region && !collapsed && (
            <button type="button" className="text-xs text-gray-500 hover:text-gray-800" onClick={clearRegion}>נקה סימון</button>
          )}
          <button type="button" className="text-xs text-blue-700 hover:text-blue-900" onClick={() => setCollapsed(v => !v)}>
            {collapsed ? '🔼 הגדל תמונה' : '🔽 הקטן תמונה'}
          </button>
        </div>
      </div>
      <div
        ref={imgWrapRef}
        className="relative inline-block w-full rounded border border-gray-200 overflow-hidden select-none"
        style={{ cursor: canEdit && subStage && !collapsed ? 'crosshair' : 'default', maxHeight: collapsed ? 70 : undefined }}
        onMouseDown={collapsed ? undefined : onMouseDown}
        onMouseMove={collapsed ? undefined : onMouseMove}
        onMouseUp={collapsed ? undefined : onMouseUp}
        onMouseLeave={() => { setDragStart(null); setDragCurrent(null) }}
      >
        <img src={def.src} alt={def.label} className={collapsed ? 'w-full block pointer-events-none object-cover' : 'w-full block pointer-events-none'} style={collapsed ? { height: 70, objectPosition: 'center' } : undefined} draggable={false} />
        {shownBox && (
          <div
            className="absolute border-4 border-red-600 rounded-sm pointer-events-none"
            style={{ left: `${shownBox.xPct}%`, top: `${shownBox.yPct}%`, width: `${shownBox.wPct}%`, height: `${shownBox.hPct}%` }}
          />
        )}
      </div>
      {canEdit && subStage && !region && !collapsed && (
        <div className="text-xs text-gray-400 mt-1">גרור על התמונה כדי לסמן איפה נמצא &quot;{subStage}&quot;</div>
      )}
    </div>
  )
}
