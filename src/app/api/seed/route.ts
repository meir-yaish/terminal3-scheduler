import { NextResponse } from 'next/server'
import { seedProject } from '@/lib/seed'

export async function POST() {
  try {
    const project = await seedProject()
    return NextResponse.json({ success: true, project })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
