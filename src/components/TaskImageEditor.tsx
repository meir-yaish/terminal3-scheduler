'use client'
import { useRef, useState, useEffect } from 'react'

interface Region { xPct: number; yPct: number; wPct: number; hPct: number }

function compressImage(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function TaskImageEditor({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [customImageRegion, setCustomImageRegion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgWrapRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/tasks/${taskId}`).then(r => r.json()).then(t => {
      if (cancelled) return
      setCustomImage(t.customImage ?? null)
      setCustomImageRegion(t.customImageRegion ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [taskId])

  async function save(data: { customImage?: string | null; customImageRegion?: string | null }) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  let region: Region | null = null
  try { region = customImageRegion ? JSON.parse(customImageRegion) : null } catch { region = null }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file)
    setCustomImage(dataUrl)
    setCustomImageRegion(null)
    await save({ customImage: dataUrl, customImageRegion: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deleteImage() {
    setCustomImage(null)
    setCustomImageRegion(null)
    await save({ customImage: null, customImageRegion: null })
  }

  async function clearRegion() {
    setCustomImageRegion(null)
    await save({ customImageRegion: null })
  }

  function pctFromEvent(clientX: number, clientY: number) {
    const rect = imgWrapRef.current!.getBoundingClientRect()
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    return { x: xPct, y: yPct }
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!canEdit) return
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
    if (!dragStart || !dragCurrent) return
    const xPct = Math.min(dragStart.x, dragCurrent.x)
    const yPct = Math.min(dragStart.y, dragCurrent.y)
    const wPct = Math.abs(dragCurrent.x - dragStart.x)
    const hPct = Math.abs(dragCurrent.y - dragStart.y)
    setDragStart(null)
    setDragCurrent(null)
    if (wPct < 1 || hPct < 1) return // ignore accidental clicks
    const json = JSON.stringify({ xPct, yPct, wPct, hPct })
    setCustomImageRegion(json)
    await save({ customImageRegion: json })
  }

  const liveBox = dragStart && dragCurrent ? {
    xPct: Math.min(dragStart.x, dragCurrent.x),
    yPct: Math.min(dragStart.y, dragCurrent.y),
    wPct: Math.abs(dragCurrent.x - dragStart.x),
    hPct: Math.abs(dragCurrent.y - dragStart.y),
  } : null

  const shownBox = liveBox ?? region

  if (loading) return null

  if (!customImage) {
    return canEdit ? (
      <div dir="rtl">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          type="button"
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded border border-dashed border-gray-300 hover:bg-gray-200 w-full"
          onClick={() => fileInputRef.current?.click()}
        >📷 הוסף תמונה למשימה זו</button>
      </div>
    ) : null
  }

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{canEdit ? 'גרור על התמונה כדי לסמן אזור' : 'תמונת המשימה'}</span>
        <div className="flex gap-2 items-center">
          {canEdit && region && !collapsed && (
            <button type="button" className="text-xs text-gray-500 hover:text-gray-800" onClick={clearRegion}>נקה סימון</button>
          )}
          {canEdit && !collapsed && (
            <button type="button" className="text-xs text-red-600 hover:text-red-800" onClick={deleteImage}>🗑 מחק תמונה</button>
          )}
          <button type="button" className="text-xs text-blue-700 hover:text-blue-900" onClick={() => setCollapsed(v => !v)}>
            {collapsed ? '🔼 הגדל תמונה' : '🔽 הקטן תמונה'}
          </button>
        </div>
      </div>
      <div
        ref={imgWrapRef}
        className="relative inline-block w-full rounded border border-gray-200 overflow-hidden select-none"
        style={{ cursor: canEdit && !collapsed ? 'crosshair' : 'default', maxHeight: collapsed ? 70 : undefined }}
        onMouseDown={collapsed ? undefined : onMouseDown}
        onMouseMove={collapsed ? undefined : onMouseMove}
        onMouseUp={collapsed ? undefined : onMouseUp}
        onMouseLeave={() => { setDragStart(null); setDragCurrent(null) }}
      >
        <img src={customImage} alt="תמונת משימה" className={collapsed ? 'w-full block pointer-events-none object-cover' : 'w-full block pointer-events-none'} style={collapsed ? { height: 70, objectPosition: 'center' } : undefined} draggable={false} />
        {shownBox && (
          <div
            className="absolute border-4 border-red-600 rounded-sm pointer-events-none"
            style={{ left: `${shownBox.xPct}%`, top: `${shownBox.yPct}%`, width: `${shownBox.wPct}%`, height: `${shownBox.hPct}%` }}
          />
        )}
      </div>
    </div>
  )
}
