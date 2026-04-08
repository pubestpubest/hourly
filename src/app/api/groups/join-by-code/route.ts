import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await req.json()
  if (!inviteCode) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const [group] = await query<{ id: number; name: string; invite_code: string }>(
    'SELECT id, name, invite_code FROM groups WHERE invite_code = $1',
    [inviteCode]
  )

  if (!group) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  const existing = await query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [group.id, session.userId]
  )

  if (existing.length === 0) {
    await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [
      group.id,
      session.userId,
    ])
  }

  return NextResponse.json({ group: { id: group.id, name: group.name } })
}
