'use client'

interface Post {
  id: number
  imagePath: string
}

interface GridCellProps {
  post: Post | null
  isOwn: boolean
  size: number
  onClick?: () => void
}

export default function GridCell({ post, isOwn, size, onClick }: GridCellProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: 'relative',
        borderRight: '1px solid #141414',
        borderBottom: '1px solid #141414',
        background: isOwn && !post ? 'rgba(255,255,255,0.018)' : 'transparent',
        cursor: isOwn && !post ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      {post ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/posts/${post.id}/image`}
          alt=""
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : isOwn ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2a2a2a',
            fontSize: 22,
            fontWeight: 300,
            userSelect: 'none',
          }}
        >
          +
        </div>
      ) : null}
    </div>
  )
}
