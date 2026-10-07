import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  const regions = await prisma.facadeRegion.findMany({
    where: key ? { key } : {},
  })
  return NextResponse.json(regions)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { key, code, xPct, yPct, wPct, hPct } = data
  const region = await prisma.facadeRegion.upsert({
    where: { key_code: { key, code } },
    update: { xPct, yPct, wPct, hPct },
    create: { key, code, xPct, yPct, wPct, hPct },
  })
  return NextResponse.json(region)
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  const code = req.nextUrl.searchParams.get('code')
  if (!key || !code) return NextResponse.json({ error: 'key and code required' }, { status: 400 })
  await prisma.facadeRegion.deleteMany({ where: { key, code } })
  return NextResponse.json({ success: true })
}
