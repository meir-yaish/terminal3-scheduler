'use client'
import { useState, useEffect } from 'react'

const PASSWORDS: Record<string, string> = {
  'מאיר': 'REDACTED_PHONE',
  'אבי': 'REDACTED_PHONE',
  'דין': 'REDACTED_PHONE',
}

export default function CostAnalysisGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'blocked' | 'locked' | 'ok'>('checking')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const n = (localStorage.getItem('userName') || '').trim()
    setName(n)
    if (!PASSWORDS[n]) { setStatus('blocked'); return }
    const unlocked = sessionStorage.getItem('costAnalysisUnlocked') === '1'
    setStatus(unlocked ? 'ok' : 'locked')
  }, [])

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (code.trim() === PASSWORDS[name]) {
      sessionStorage.setItem('costAnalysisUnlocked', '1')
      setStatus('ok')
    } else {
      setError('קוד שגוי')
    }
  }

  if (status === 'checking') return null

  if (status === 'blocked') {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF2F5', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: 8, padding: '32px 40px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, color: '#C00000', fontWeight: 700 }}>אין לך הרשאה לצפות בדוח זה</div>
        </div>
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF2F5', fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleUnlock} style={{ background: 'white', borderRadius: 8, padding: '32px 40px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: 320 }}>
          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1F3864', textAlign: 'center', marginBottom: 16 }}>דוח זה מוגן בקוד כניסה</div>
          <input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="קוד כניסה"
            autoFocus
            style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: error ? '1.5px solid #ef4444' : '1.5px solid #d1d5db', borderRadius: 6, marginBottom: error ? 6 : 12, boxSizing: 'border-box', textAlign: 'right' }}
          />
          {error && <div style={{ color: '#ef4444', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
          <button type="submit" style={{ width: '100%', padding: 10, background: '#1F3864', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            כניסה
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
