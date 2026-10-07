import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const recipients = await prisma.recipient.findMany({
    where: projectId ? { projectId } : {}
  })
  return NextResponse.json(recipients)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const recipient = await prisma.recipient.create({ data })
  return NextResponse.json(recipient)
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  const recipient = await prisma.recipient.update({ where: { id }, data })
  return NextResponse.json(recipient)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.recipient.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
