import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { inviteCode } = await req.json()

  if (!inviteCode) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const [group] = await query<{ id: number; name: string; invite_code: string }>(
    'SELECT id, name, invite_code FROM groups WHERE id = $1',
    [id]
  )

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.invite_code !== inviteCode) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
  }

  const existing = await query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [id, session.userId]
  )

  if (existing.length === 0) {
    await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [
      id,
      session.userId,
    ])
  }

  return NextResponse.json({ group: { id: group.id, name: group.name } })
}
