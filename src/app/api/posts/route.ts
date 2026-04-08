import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { uploadImage } from '@/lib/minio'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  const hourSlotStr = formData.get('hour_slot') as string | null

  if (!file) return NextResponse.json({ error: 'image required' }, { status: 400 })
  if (!hourSlotStr) return NextResponse.json({ error: 'hour_slot required' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid image type' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 400 })
  }

  const hourSlot = new Date(hourSlotStr)
  if (isNaN(hourSlot.getTime())) {
    return NextResponse.json({ error: 'Invalid hour_slot' }, { status: 400 })
  }
  hourSlot.setUTCMinutes(0, 0, 0)

  if (hourSlot.getTime() > Date.now() + 60_000) {
    return NextResponse.json({ error: 'Cannot post to future slots' }, { status: 400 })
  }

  const extMap: Record<string, string> = { 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' }
  const ext = extMap[file.type] ?? 'jpg'
  const objectName = `users/${session.userId}/${hourSlot.getTime()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadImage(objectName, buffer, file.type)

  const [post] = await query<{ id: number }>(
    `INSERT INTO posts (user_id, hour_slot, image_path)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, hour_slot)
     DO UPDATE SET image_path = EXCLUDED.image_path, created_at = NOW()
     RETURNING id`,
    [session.userId, hourSlot.toISOString(), objectName]
  )

  return NextResponse.json({ post: { id: post.id, imagePath: objectName } }, { status: 201 })
}
