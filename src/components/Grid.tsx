'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import GridCell from './GridCell'
import UploadSheet from './UploadSheet'

interface User {
  id: number
  username: string
}

interface Post {
  id: number
  imagePath: string
}

interface GridSlot {
  hourSlot: string
  posts: Record<number, Post | null>
}

interface GridProps {
  currentUserId: number
}

const TZ = 'Asia/Bangkok'
const TIME_COL = 64 // px, fixed width for the time label column
const BATCH = 48

function toThaiDate(d: Date) {
  return d.toLocaleDateString('en-US', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric' })
}

function HourLabel({ hourSlot }: { hourSlot: string }) {
  const d = new Date(hourSlot)
  const now = new Date()
  const isToday = toThaiDate(d) === toThaiDate(now)
  const isYesterday = toThaiDate(d) === toThaiDate(new Date(now.getTime() - 86_400_000))

  const time = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
  const day = isToday ? 'Today' : isYesterday ? 'Yesterday'
    : d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })

  return (
    <>
      <span style={{ display: 'block', color: '#ccc', fontSize: 11, fontWeight: 500 }}>{time}</span>
      <span style={{ display: 'block', color: '#777', fontSize: 10 }}>{day}</span>
    </>
  )
}

export default function Grid({ currentUserId }: GridProps) {
  const [users, setUsers] = useState<User[]>([])
  const [slots, setSlots] = useState<GridSlot[]>([])
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [cellSize, setCellSize] = useState(96)

  const loadingRef = useRef(false)
  const slotsRef = useRef<GridSlot[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userCountRef = useRef(0)

  // Compute cell size to fill width with square cells
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const count = userCountRef.current
      if (!count) return
      const size = Math.max(64, Math.floor((el.clientWidth - TIME_COL) / count))
      setCellSize(size)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fetchSlots = useCallback(async (before?: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    const url = `/api/grid?limit=${BATCH}` + (before ? `&before=${encodeURIComponent(before)}` : '')
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()

      // Update user count for cell sizing
      userCountRef.current = data.users.length
      // Trigger resize calc
      if (containerRef.current) {
        const count = data.users.length
        if (count) {
          const size = Math.max(64, Math.floor((containerRef.current.clientWidth - TIME_COL) / count))
          setCellSize(size)
        }
      }

      if (!before) {
        setUsers(data.users)
        setSlots(data.slots)
        slotsRef.current = data.slots
      } else {
        const merged = [...slotsRef.current, ...data.slots]
        slotsRef.current = merged
        setSlots(merged)
      }
      setHasMore(data.slots.length === BATCH)
    } finally {
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    slotsRef.current = []
    setSlots([])
    setHasMore(true)
    fetchSlots()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          const last = slotsRef.current[slotsRef.current.length - 1]
          if (last) fetchSlots(last.hourSlot)
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, fetchSlots])

  const handleUploadSuccess = (hourSlot: string, post: Post) => {
    const updated = slotsRef.current.map(s =>
      s.hourSlot !== hourSlot ? s : { ...s, posts: { ...s.posts, [currentUserId]: post } }
    )
    slotsRef.current = updated
    setSlots(updated)
    setUploadTarget(null)
  }

  const n = users.length

  return (
    <>
      <div
        ref={containerRef}
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          height: 'calc(100vh - 52px)',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${TIME_COL}px repeat(${n}, ${cellSize}px)`,
            width: '100%',
          }}
        >
          {/* Sticky header row */}
          <div style={headerCell(TIME_COL)} />
          {users.map(u => (
            <div
              key={u.id}
              style={{
                ...headerCell(cellSize),
                background: u.id === currentUserId
                  ? 'linear-gradient(to bottom, #0e0e12, #0a0a0a)'
                  : '#0a0a0a',
              }}
            >
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: u.id === currentUserId ? '#ffffff' : '#cccccc',
                maxWidth: cellSize - 10,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {u.username}
              </span>
            </div>
          ))}

          {/* Grid rows */}
          {slots.map(slot => (
            <Fragment key={slot.hourSlot}>
              <div style={{
                height: cellSize,
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-end', justifyContent: 'center',
                paddingRight: 8,
                borderBottom: '1px solid #141414',
                userSelect: 'none', flexShrink: 0,
              }}>
                <HourLabel hourSlot={slot.hourSlot} />
              </div>
              {users.map(u => (
                <GridCell
                  key={u.id}
                  post={slot.posts[u.id] ?? null}
                  isOwn={u.id === currentUserId}
                  size={cellSize}
                  onClick={
                    u.id === currentUserId && !slot.posts[u.id]
                      ? () => setUploadTarget(slot.hourSlot)
                      : undefined
                  }
                />
              ))}
            </Fragment>
          ))}

          <div ref={sentinelRef} style={{ gridColumn: '1 / -1', height: 1 }} />
        </div>
      </div>

      {uploadTarget && (
        <UploadSheet
          hourSlot={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSuccess={post => handleUploadSuccess(uploadTarget, post)}
        />
      )}
    </>
  )
}

function headerCell(width: number): React.CSSProperties {
  return {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    width,
    height: 52,
    background: '#0a0a0a',
    borderBottom: '1px solid #1a1a1a',
    borderRight: '1px solid #141414',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    gap: 3,
    flexShrink: 0,
  }
}
