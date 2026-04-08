import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-prod')
}

export interface SessionPayload {
  userId: number
  username: string
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as SessionPayload
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}
