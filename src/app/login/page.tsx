'use client'
import { useState, useEffect, useRef } from 'react'

interface UserOption {
  name: string
  email: string
}

export default function LoginPage() {
  const [users, setUsers] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/auth/emails')
      .then(r => r.json())
      .then((data: UserOption[]) => {
        if (Array.isArray(data)) setUsers(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const searchLower = search.toLowerCase().trim()

  const filtered = searchLower
    ? users.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      )
    : users

  function selectUser(u: UserOption) {
    setSearch(u.name)
    setSelectedUser(u)
    setOpen(false)
    setError('')
    passwordRef.current?.focus()
  }

  function tryAutoSelect(): UserOption | null {
    if (selectedUser) return selectedUser
    if (!searchLower) return null
    const exactName = users.find(u => u.name.toLowerCase() === searchLower)
    if (exactName) return exactName
    const exactEmail = users.find(u => u.email.toLowerCase() === searchLower)
    if (exactEmail) return exactEmail
    if (filtered.length === 1) return filtered[0]
    return null
  }

  function handleUsernameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const match = tryAutoSelect()
      if (match) {
        selectUser(match)
      } else if (filtered.length === 0) {
        setError('לא נמצא משתמש. בחר מהרשימה')
      }
    }
  }

  async function handleLogin() {
    const user = tryAutoSelect()
    if (!user) {
      setError('יש לבחור משתמש מהרשימה')
      return
    }
    if (!phone) {
      setError('יש להזין סיסמה')
      return
    }
    if (!selectedUser) {
      setSearch(user.name)
      setSelectedUser(user)
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, phone }),
      })
      const data = await res.json()
      if (res.ok && data.name) {
        localStorage.setItem('userName', data.name)
        window.location.href = '/'
      } else {
        setError(data.error || 'שגיאה בהתחברות')
      }
    } catch {
      setError('שגיאת תקשורת — נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  const isSelected = !!selectedUser
  const canSubmit = (isSelected || !!tryAutoSelect()) && !!phone && !loading

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    fontSize: 15, textAlign: 'right' as const,
    outline: 'none', fontFamily: 'Arial', boxSizing: 'border-box' as const,
    background: 'white', transition: 'border-color 0.15s',
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
        <h1 style={{ color: '#1F3864', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>טרמינל סנטר 3</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>ניהול לוח זמנים — קיר מסך</p>

        <div style={{ marginBottom: 12, position: 'relative' }} ref={wrapperRef}>
          <label style={{ display: 'block', textAlign: 'right', fontSize: 13, color: '#374151', marginBottom: 4, fontWeight: 600 }}>שם משתמש</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setSelectedUser(null)
                setOpen(true)
                setError('')
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleUsernameKeyDown}
              placeholder="הקלד שם או בחר מהרשימה..."
              style={{
                ...inputBase,
                border: isSelected ? '1.5px solid #22C55E' : '1.5px solid #D1D5DB',
                paddingLeft: isSelected ? 36 : 16,
              }}
            />
            {isSelected && (
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#22C55E', fontSize: 18,
              }}>✓</span>
            )}
          </div>
          {open && filtered.length > 0 && !isSelected && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 10,
              background: 'white', border: '1.5px solid #D1D5DB', borderRadius: 10,
              marginTop: 4, maxHeight: 200, overflowY: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}>
              {filtered.map(u => (
                <div
                  key={u.email}
                  onClick={() => selectUser(u)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                    textAlign: 'right', borderBottom: '1px solid #F3F4F6',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexDirection: 'row-reverse',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F0F4FF')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>{u.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', textAlign: 'right', fontSize: 13, color: '#374151', marginBottom: 4, fontWeight: 600 }}>סיסמה</label>
          <input
            ref={passwordRef}
            type="password"
            value={phone}
            onChange={e => { setPhone(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="הכנס סיסמה..."
            style={{ ...inputBase, border: '1.5px solid #D1D5DB' }}
          />
        </div>

        {error && (
          <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: canSubmit ? '#1F3864' : '#9CA3AF',
            color: 'white', border: 'none', fontSize: 15, fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'default',
            fontFamily: 'Arial', transition: 'background 0.15s',
          }}
        >
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </div>
    </div>
  )
}
