'use client'
import { useState, useEffect } from 'react'

const ALLOWED = ['מאיר', 'אבי', 'דין']

export default function ReportGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'blocked' | 'ok'>('checking')

  useEffect(() => {
    const n = (localStorage.getItem('userName') || '').trim()
    setStatus(ALLOWED.includes(n) ? 'ok' : 'blocked')
  }, [])

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

  return <>{children}</>
}
