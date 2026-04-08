import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const before = searchParams.get('before') // ISO string — load slots OLDER than this
  const limit = Math.min(parseInt(searchParams.get('limit') || '48'), 120)

  // Check membership
  const member = await query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [id, session.userId]
  )
  if (!member.length) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  // Get all group members ordered by join time
  const members = await query<{ id: number; username: string }>(
    `SELECT u.id, u.username
     FROM users u
     JOIN group_members gm ON gm.user_id = u.id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [id]
  )

  // Build hour slots aligned to Thailand time (UTC+7)
  // e.g. 3 PM Bangkok = 08:00 UTC stored as the slot key
  const TZ_OFFSET_MS = 7 * 3_600_000 // Asia/Bangkok = UTC+7

  function currentThaiHourAsUTC(fromMs: number): Date {
    // Floor to the Thai hour boundary, then convert back to UTC
    const thaiMs = fromMs + TZ_OFFSET_MS
    const thaiHourMs = Math.floor(thaiMs / 3_600_000) * 3_600_000
    return new Date(thaiHourMs - TZ_OFFSET_MS)
  }

  const refMs = before ? new Date(before).getTime() - 1 : Date.now()
  const startHour = currentThaiHourAsUTC(refMs)

  const slots: string[] = []
  for (let i = 0; i < limit; i++) {
    const slot = new Date(startHour.getTime() - i * 3_600_000)
    slots.push(slot.toISOString())
  }

  const newestSlot = slots[0]
  const oldestSlot = slots[slots.length - 1]

  // Fetch posts for this range
  const posts = await query<{
    id: number
    user_id: number
    hour_slot: Date
    image_path: string
  }>(
    `SELECT id, user_id, hour_slot, image_path
     FROM posts
     WHERE group_id = $1
       AND hour_slot <= $2
       AND hour_slot >= $3`,
    [id, newestSlot, oldestSlot]
  )

  // Build lookup: normalizedHourISO -> userId -> post
  const postMap: Record<string, Record<number, { id: number; imagePath: string }>> = {}
  for (const post of posts) {
    const d = new Date(post.hour_slot)
    d.setUTCMinutes(0, 0, 0)
    const key = d.toISOString()
    if (!postMap[key]) postMap[key] = {}
    postMap[key][post.user_id] = { id: post.id, imagePath: post.image_path }
  }

  const gridSlots = slots.map(hourSlot => ({
    hourSlot,
    posts: Object.fromEntries(members.map(m => [m.id, postMap[hourSlot]?.[m.id] ?? null])),
  }))

  return NextResponse.json({
    members,
    slots: gridSlots,
    currentUserId: session.userId,
  })
}
