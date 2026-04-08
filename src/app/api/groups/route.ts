import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await query<{
    id: number
    name: string
    invite_code: string
    created_at: string
    member_count: number
  }>(
    `SELECT g.id, g.name, g.invite_code, g.created_at,
            COUNT(gm2.id)::int AS member_count
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     JOIN group_members gm2 ON gm2.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [session.userId]
  )

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (name.trim().length > 100) return NextResponse.json({ error: 'Name too long' }, { status: 400 })

  const inviteCode = randomBytes(6).toString('hex')

  const [group] = await query<{ id: number; name: string; invite_code: string }>(
    'INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING id, name, invite_code',
    [name.trim(), inviteCode, session.userId]
  )

  await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [
    group.id,
    session.userId,
  ])

  return NextResponse.json({ group }, { status: 201 })
}
