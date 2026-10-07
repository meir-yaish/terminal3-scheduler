import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface LinkResult {
  from: string
  to: string
}

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'חסר projectId' }, { status: 400 })

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  })

  const linked: LinkResult[] = []

  function extractScaffold(name: string): string | null {
    const m = name.match(/ערסל\s+([\d.]+)/)
    return m ? m[1] : null
  }

  const alumTasks = tasks.filter(t => t.name.startsWith('שלד אלומיניום'))
  const glazeTasks = tasks.filter(t => t.name.startsWith('זיגוג'))
  const bullnoseTasks = tasks.filter(t => t.name.startsWith('בולנוזים'))

  const alumByScaffold = new Map<string, typeof tasks[0]>()
  for (const t of alumTasks) {
    const s = extractScaffold(t.name)
    if (s) alumByScaffold.set(`${s}|${t.phase}`, t)
  }

  const glazeByScaffold = new Map<string, typeof tasks[0]>()
  for (const t of glazeTasks) {
    const s = extractScaffold(t.name)
    if (s) glazeByScaffold.set(`${s}|${t.phase}`, t)
  }

  for (const gt of glazeTasks) {
    const s = extractScaffold(gt.name)
    if (!s) continue
    const at = alumByScaffold.get(`${s}|${gt.phase}`)
    if (!at) continue
    const deps = safeParseDeps(gt.dependencies)
    if (!deps.includes(at.id)) {
      deps.push(at.id)
      await prisma.task.update({ where: { id: gt.id }, data: { dependencies: JSON.stringify(deps) } })
      linked.push({ from: at.name, to: gt.name })
    }
  }

  for (const bt of bullnoseTasks) {
    const s = extractScaffold(bt.name)
    if (!s) continue
    const gt = glazeByScaffold.get(`${s}|${bt.phase}`)
    if (!gt) continue
    const deps = safeParseDeps(bt.dependencies)
    if (!deps.includes(gt.id)) {
      deps.push(gt.id)
      await prisma.task.update({ where: { id: bt.id }, data: { dependencies: JSON.stringify(deps) } })
      linked.push({ from: gt.name, to: bt.name })
    }
  }

  const phases = ['הרכבה בניין B', 'הרכבה בניין A']
  for (const phase of phases) {
    const phaseAlum = alumTasks.filter(t => t.phase === phase).sort((a, b) => a.order - b.order)
    const phaseGlaze = glazeTasks.filter(t => t.phase === phase).sort((a, b) => a.order - b.order)

    for (let i = 1; i < phaseAlum.length; i++) {
      const prevGlaze = phaseGlaze.find(g => {
        const gs = extractScaffold(g.name)
        const prevAs = extractScaffold(phaseAlum[i - 1].name)
        return gs === prevAs
      })
      if (!prevGlaze) continue
      const deps = safeParseDeps(phaseAlum[i].dependencies)
      if (!deps.includes(prevGlaze.id)) {
        deps.push(prevGlaze.id)
        await prisma.task.update({ where: { id: phaseAlum[i].id }, data: { dependencies: JSON.stringify(deps) } })
        linked.push({ from: prevGlaze.name, to: phaseAlum[i].name })
      }
    }
  }

  const skeleton = tasks.find(t => t.phase === 'שלד')
  if (skeleton) {
    for (const phase of phases) {
      const firstAlum = alumTasks.filter(t => t.phase === phase).sort((a, b) => a.order - b.order)[0]
      if (firstAlum) {
        const deps = safeParseDeps(firstAlum.dependencies)
        if (!deps.includes(skeleton.id)) {
          deps.push(skeleton.id)
          await prisma.task.update({ where: { id: firstAlum.id }, data: { dependencies: JSON.stringify(deps) } })
          linked.push({ from: skeleton.name, to: firstAlum.name })
        }
      }
    }
  }

  const steelTasks = tasks.filter(t => t.name.startsWith('שלד פלדה'))
  const vitrineTasks = tasks.filter(t => t.name.startsWith('ויטרינה וזיגוג'))
  for (const st of steelTasks) {
    const area = st.name.replace('שלד פלדה — ', '')
    const vt = vitrineTasks.find(v => v.name.includes(area))
    if (!vt) continue
    const deps = safeParseDeps(vt.dependencies)
    if (!deps.includes(st.id)) {
      deps.push(st.id)
      await prisma.task.update({ where: { id: vt.id }, data: { dependencies: JSON.stringify(deps) } })
      linked.push({ from: st.name, to: vt.name })
    }
  }

  const bridgeSkeleton = tasks.find(t => t.name.includes('שלד — גשר'))
  const bridgeWork = tasks.find(t => t.name.includes('עבודות נירוסטה וזיגוג — גשר'))
  if (bridgeSkeleton && bridgeWork) {
    const deps = safeParseDeps(bridgeWork.dependencies)
    if (!deps.includes(bridgeSkeleton.id)) {
      deps.push(bridgeSkeleton.id)
      await prisma.task.update({ where: { id: bridgeWork.id }, data: { dependencies: JSON.stringify(deps) } })
      linked.push({ from: bridgeSkeleton.name, to: bridgeWork.name })
    }
  }

  return NextResponse.json({ linked: linked.length, details: linked.slice(0, 30) })
}

function safeParseDeps(val: string | null | undefined): string[] {
  try { return JSON.parse(val || '[]') } catch { return [] }
}
