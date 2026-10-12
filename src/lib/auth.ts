import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthPayload extends JWTPayload {
  name: string
  email: string
}

export const COOKIE_NAME = 'auth_token'

function getSecret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET not configured')
  return new TextEncoder().encode(s)
}

export async function signToken(payload: { name: string; email: string }): Promise<string> {
  return new SignJWT({ name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as AuthPayload
  } catch {
    return null
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthPayload | NextResponse> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'טוקן לא תקף' }, { status: 401 })
  }
  return payload
}
