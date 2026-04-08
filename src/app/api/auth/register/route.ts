import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3–32 alphanumeric characters or underscores' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const existing = await query('SELECT id FROM users WHERE username = $1', [username])
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Username taken' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 10)
  const [user] = await query<{ id: number; username: string }>(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, hash]
  )

  const token = await signToken({ userId: user.id, username: user.username })

  const res = NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 201 })
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
