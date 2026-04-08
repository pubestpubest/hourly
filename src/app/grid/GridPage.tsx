'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Grid from '@/components/Grid'
import UploadSheet from '@/components/UploadSheet'

interface Props {
  currentUserId: number
  username: string
}

function currentThaiHourSlot(): string {
  const TZ_OFFSET_MS = 7 * 3_600_000
  const thaiHourMs = Math.floor((Date.now() + TZ_OFFSET_MS) / 3_600_000) * 3_600_000
  return new Date(thaiHourMs - TZ_OFFSET_MS).toISOString()
}

export default function GridPage({ currentUserId, username }: Props) {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', height: 52, borderBottom: '1px solid #141414', flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          hourly
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#444' }}>{username}</span>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: '#fff', color: '#000', border: 'none', borderRadius: 7,
              padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + post
          </button>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer' }}
          >
            out
          </button>
        </div>
      </div>

      <Grid currentUserId={currentUserId} />

      {showUpload && (
        <UploadSheet
          hourSlot={currentThaiHourSlot()}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); window.location.reload() }}
        />
      )}
    </div>
  )
}
