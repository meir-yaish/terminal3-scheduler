import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { projectId, changes } = await req.json()

    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })
    if (!settings?.emailFrom || !settings?.emailPassword) {
      return NextResponse.json({ error: 'הגדרות מייל חסרות' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    const recipients = await prisma.recipient.findMany({ where: { projectId, active: true } })
    const tasks = await prisma.task.findMany({ where: { projectId }, orderBy: { order: 'asc' } })
    const milestones = await prisma.milestone.findMany({ where: { projectId }, orderBy: { date: 'asc' } })

    const now = new Date()
    const dateStr = now.toLocaleDateString('he-IL')

    const changesHtml = changes && changes.length > 0
      ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:12px;border-radius:6px;margin-bottom:20px;">
          <strong>🔄 עדכונים חדשים:</strong><ul>
          ${changes.map((c: any) => `<li>${c.taskName}: ${c.field} שונה מ-<s>${c.oldValue}</s> ל-<strong>${c.newValue}</strong>${c.changedBy ? ` <span style="color:#888;">(ע"י ${c.changedBy})</span>` : ''}</li>`).join('')}
          </ul></div>`
      : ''

    const milestonesHtml = milestones.map(m => {
      const statusColor = m.status === 'green' ? '#00B050' : m.status === 'yellow' ? '#FFC000' : '#C00000'
      const statusText = m.status === 'green' ? '✅ בזמן' : m.status === 'yellow' ? '⚠️ בסיכון' : '🔴 חריגה'
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${m.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${new Date(m.date).toLocaleDateString('he-IL')}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;color:${statusColor};font-weight:bold;">${statusText}</td>
      </tr>`
    }).join('')

    const tasksHtml = tasks.map(t => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${t.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${t.phase}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${t.responsible}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${new Date(t.startDate).toLocaleDateString('he-IL')}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${new Date(t.endDate).toLocaleDateString('he-IL')}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">
        <div style="background:#e0e0e0;border-radius:4px;height:12px;width:100px;">
          <div style="background:#00B050;height:12px;border-radius:4px;width:${t.progress}%;"></div>
        </div>
        ${t.progress}%
      </td>
    </tr>`).join('')

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; direction: rtl; color: #333; margin: 0; padding: 20px; }
  h1 { color: #1F3864; border-bottom: 3px solid #1F3864; padding-bottom: 8px; }
  h2 { color: #1F3864; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1F3864; color: white; padding: 8px 12px; text-align: right; }
</style></head>
<body>
  <h1>🏗️ ${project?.name} — עדכון לוח זמנים</h1>
  <p>תאריך עדכון: <strong>${dateStr}</strong></p>
  ${changesHtml}
  <h2>📍 אבני דרך</h2>
  <table><thead><tr><th>אבן דרך</th><th>תאריך יעד</th><th>סטטוס</th></tr></thead>
  <tbody>${milestonesHtml}</tbody></table>
  <h2>📋 כל המשימות</h2>
  <table><thead><tr><th>משימה</th><th>שלב</th><th>אחראי</th><th>תחילה</th><th>סיום</th><th>התקדמות</th></tr></thead>
  <tbody>${tasksHtml}</tbody></table>
  <br><hr><p style="color:#999;font-size:12px;">מייל זה נשלח אוטומטית ממערכת ניהול לוח הזמנים</p>
</body></html>`

    await sendEmail({
      from: settings.emailFrom,
      password: settings.emailPassword,
      to: recipients.map(r => r.email),
      subject: `עדכון לוח זמנים - ${project?.name} - ${dateStr}`,
      html
    })

    return NextResponse.json({ success: true, sent: recipients.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
