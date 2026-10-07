'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Recipient { id: string; name: string; email: string; phone: string | null; active: boolean }
interface Settings { emailFrom: string; emailPassword: string; weeklyReportDay: number; weeklyReportTime: string }
interface Baseline { id: string; name: string; createdAt: string; createdBy: string | null; _count: { tasks: number } }

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ emailFrom: '', emailPassword: '', weeklyReportDay: 0, weeklyReportTime: '08:00' })
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [creatingBaseline, setCreatingBaseline] = useState(false)

  useEffect(() => {
    const pid = localStorage.getItem('projectId')
    setProjectId(pid)

    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      pid ? fetch(`/api/recipients?projectId=${pid}`).then(r => r.json()) : Promise.resolve([]),
      pid ? fetch(`/api/baselines?projectId=${pid}`).then(r => r.json()) : Promise.resolve([]),
    ]).then(([s, r, b]) => {
      if (s) setSettings(s)
      if (r) setRecipients(r)
      if (b) setBaselines(b)
    })
  }, [])

  async function createBaseline() {
    if (!projectId) return
    const name = window.prompt('שם לבייסליין (למשל: "מקורי" או תאריך):', new Date().toLocaleDateString('he-IL'))
    if (name === null) return
    setCreatingBaseline(true)
    const userName = localStorage.getItem('userName') || ''
    const res = await fetch('/api/baselines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: name || new Date().toLocaleDateString('he-IL'), createdBy: userName }),
    })
    const b = await res.json()
    setBaselines(prev => [b, ...prev])
    setCreatingBaseline(false)
  }

  async function deleteBaseline(id: string) {
    if (!window.confirm('למחוק את הבייסליין הזה? הפעולה בלתי הפיכה.')) return
    setBaselines(prev => prev.filter(b => b.id !== id))
    await fetch(`/api/baselines/${id}`, { method: 'DELETE' })
  }

  async function saveSettings() {
    setSaving(true)
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addRecipient() {
    if (!newName || !newEmail || !projectId) return
    const res = await fetch('/api/recipients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone || null, projectId, active: true })
    })
    const r = await res.json()
    setRecipients(prev => [...prev, r])
    setNewName(''); setNewEmail(''); setNewPhone('')
  }

  async function toggleRecipient(id: string, active: boolean) {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, active } : r))
    await fetch('/api/recipients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) })
  }

  async function updatePhone(id: string, phone: string) {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, phone } : r))
    await fetch('/api/recipients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, phone: phone || null }) })
  }

  async function deleteRecipient(id: string) {
    setRecipients(prev => prev.filter(r => r.id !== id))
    await fetch('/api/recipients', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8', direction: 'rtl', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: '#1F3864' }} className="shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-blue-200 hover:text-white text-sm">← חזרה ללוח הזמנים</Link>
          <h1 className="text-white text-lg font-bold">⚙️ הגדרות מערכת</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Email Settings */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-[#1F3864] mb-4">📧 הגדרות מייל (Gmail)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כתובת מייל שולח</label>
              <input className="w-full border rounded-lg px-3 py-2 text-left" dir="ltr"
                placeholder="terminalsenter3@gmail.com" value={settings.emailFrom}
                onChange={e => setSettings({...settings, emailFrom: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input type="password" className="w-full border rounded-lg px-3 py-2" dir="ltr"
                placeholder="••••••••" value={settings.emailPassword}
                onChange={e => setSettings({...settings, emailPassword: e.target.value})} />
              <p className="text-xs text-gray-500 mt-1">⚠️ השתמש ב-App Password של Gmail (לא הסיסמה הרגילה)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">יום דוח שבועי</label>
                <select className="w-full border rounded-lg px-3 py-2" value={settings.weeklyReportDay}
                  onChange={e => setSettings({...settings, weeklyReportDay: parseInt(e.target.value)})}>
                  {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שעת שליחה</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2" dir="ltr"
                  value={settings.weeklyReportTime}
                  onChange={e => setSettings({...settings, weeklyReportTime: e.target.value})} />
              </div>
            </div>
            <button onClick={saveSettings} disabled={saving}
              className="w-full py-2 rounded-lg text-white font-medium"
              style={{ background: saved ? '#00B050' : '#1F3864' }}>
              {saving ? 'שומר...' : saved ? '✅ נשמר!' : 'שמור הגדרות'}
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-[#1F3864] mb-4">👥 רשימת נמענים ומשתמשים מורשים</h2>
          <div className="space-y-2 mb-4">
            {recipients.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ background: r.active ? '#F0F9F4' : '#F9F9F9' }}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={r.active} onChange={e => toggleRecipient(r.id, e.target.checked)} className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-gray-500" dir="ltr">{r.email}</div>
                  </div>
                </div>
                <input
                  className="border rounded-lg px-2 py-1 text-sm text-left w-36"
                  dir="ltr"
                  placeholder="מספר טלפון"
                  defaultValue={r.phone ?? ''}
                  onBlur={e => { if (e.target.value !== (r.phone ?? '')) updatePhone(r.id, e.target.value.trim()) }}
                />
                <button onClick={() => deleteRecipient(r.id)} className="text-red-400 hover:text-red-600 text-sm mr-2">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t pt-4">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="שם" value={newName} onChange={e => setNewName(e.target.value)} />
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm text-left" dir="ltr" placeholder="email@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <input className="w-36 border rounded-lg px-3 py-2 text-sm text-left" dir="ltr" placeholder="טלפון" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            <button onClick={addRecipient} className="px-4 py-2 bg-[#1F3864] text-white rounded-lg text-sm hover:bg-blue-800">+ הוסף</button>
          </div>
        </div>

        {/* Baselines */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-[#1F3864] mb-1">📌 בייסליין (גרסת מקור)</h2>
          <p className="text-xs text-gray-500 mb-4">שומר תמונת מצב קבועה של הלוז הנוכחי (תאריכים, שלבים, התקדמות) לצורך השוואה מול ההתקדמות בפועל בהמשך. הלוז החי ממשיך להתעדכן כרגיל.</p>
          <div className="space-y-2 mb-4">
            {baselines.length === 0 && <div className="text-sm text-gray-400">אין בייסליין שמור לפרויקט זה עדיין</div>}
            {baselines.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                <div>
                  <div className="font-medium text-sm">{b.name}</div>
                  <div className="text-xs text-gray-500">
                    נשמר {new Date(b.createdAt).toLocaleDateString('he-IL')} {new Date(b.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    {b.createdBy ? ` · ע״י ${b.createdBy}` : ''} · {b._count.tasks} משימות
                  </div>
                </div>
                <button onClick={() => deleteBaseline(b.id)} className="text-red-400 hover:text-red-600 text-sm">✕ מחק</button>
              </div>
            ))}
          </div>
          <button onClick={createBaseline} disabled={creatingBaseline || !projectId}
            className="w-full py-2 rounded-lg text-white font-medium bg-[#1F3864] hover:bg-blue-800 disabled:opacity-50">
            {creatingBaseline ? 'שומר...' : '📌 צור בייסליין חדש מהלוז הנוכחי'}
          </button>
        </div>
      </div>
    </div>
  )
}
