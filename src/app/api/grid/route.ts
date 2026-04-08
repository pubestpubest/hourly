import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const TZ_OFFSET_MS = 7 * 3_600_000 // Asia/Bangkok UTC+7
// 2026-04-08 22:00 Bangkok = 2026-04-08T15:00:00.000Z UTC — hard start of timeline
const TIMELINE_START = new Date('2026-04-08T15:00:00.000Z')

function thaiHourAsUTC(fromMs: number): Date {
  const thaiHourMs = Math.floor((fromMs + TZ_OFFSET_MS) / 3_600_000) * 3_600_000
  return new Date(thaiHourMs - TZ_OFFSET_MS)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const before = searchParams.get('before')
  const limit = Math.min(parseInt(searchParams.get('limit') || '48'), 120)

  // All users ordered by registration time
  const users = await query<{ id: number; username: string }>(
    'SELECT id, username FROM users ORDER BY created_at ASC'
  )

  // Build hour slots aligned to Thai hours
  const refMs = before ? new Date(before).getTime() - 1 : Date.now()
  const startHour = thaiHourAsUTC(refMs)

  const slots: string[] = []
  for (let i = 0; i < limit; i++) {
    const slot = new Date(startHour.getTime() - i * 3_600_000)
    if (slot < TIMELINE_START) break
    slots.push(slot.toISOString())
  }

  const newestSlot = slots[0]
  const oldestSlot = slots[slots.length - 1]

  const posts = await query<{ id: number; user_id: number; hour_slot: Date; image_path: string }>(
    `SELECT id, user_id, hour_slot, image_path
     FROM posts
     WHERE hour_slot <= $1 AND hour_slot >= $2`,
    [newestSlot, oldestSlot]
  )

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
    posts: Object.fromEntries(users.map(u => [u.id, postMap[hourSlot]?.[u.id] ?? null])),
  }))

  return NextResponse.json({ users, slots: gridSlots, currentUserId: session.userId })
}
