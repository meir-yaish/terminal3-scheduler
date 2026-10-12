import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/emails']
const COOKIE_NAME = 'auth_token'

function getSecret() {
  const s = process.env.AUTH_SECRET
  return s ? new TextEncoder().encode(s) : null
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const key = getSecret()

  if (!token || !key) {
    return deny(req, pathname)
  }

  try {
    await jwtVerify(token, key)
    return NextResponse.next()
  } catch {
    const resp = deny(req, pathname)
    resp.cookies.delete(COOKIE_NAME)
    return resp
  }
}

function deny(req: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$).*)'],
}
