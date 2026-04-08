import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getImageStream } from '@/lib/minio'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [post] = await query<{ image_path: string }>(
    'SELECT image_path FROM posts WHERE id = $1',
    [id]
  )

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const nodeStream = await getImageStream(post.image_path)

  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err: Error) => controller.error(err))
    },
  })

  const ext = post.image_path.split('.').pop()?.toLowerCase()
  const contentTypeMap: Record<string, string> = { png: 'image/png', gif: 'image/gif', webp: 'image/webp' }
  const contentType = contentTypeMap[ext ?? ''] ?? 'image/jpeg'

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
