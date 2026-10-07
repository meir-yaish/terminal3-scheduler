import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { seedProject } from '@/lib/seed'

export async function GET() {
  try {
    let recipients = await prisma.recipient.findMany({
      where: { active: true },
      select: { name: true, email: true },
    })

    if (recipients.length === 0) {
      await seedProject()
      recipients = await prisma.recipient.findMany({
        where: { active: true },
        select: { name: true, email: true },
      })
    }

    return NextResponse.json(recipients)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
