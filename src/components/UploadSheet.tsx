'use client'

import { useRef, useState } from 'react'

interface Post {
  id: number
  imagePath: string
}

interface UploadSheetProps {
  hourSlot: string
  onClose: () => void
  onSuccess: (post: Post) => void
}

function formatSlotLabel(hourSlot: string): string {
  return new Date(hourSlot).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function UploadSheet({ hourSlot, onClose, onSuccess }: UploadSheetProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (f: File) => {
    setFile(f)
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (!file || uploading) return
    setUploading(true)
    setError(null)

    const fd = new FormData()
    fd.append('image', file)
    fd.append('hour_slot', hourSlot)

    try {
      const res = await fetch('/api/posts', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return }
      onSuccess(data.post)
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} />

      <div style={{
        position: 'relative', background: '#111111',
        borderRadius: '20px 20px 0 0', padding: '20px 20px 32px',
        display: 'flex', flexDirection: 'column', gap: 16,
        maxWidth: 480, width: '100%', margin: '0 auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333', margin: '0 auto 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>posting to</div>
            <div style={{ fontSize: 14, color: '#bbb', fontWeight: 500 }}>{formatSlotLabel(hourSlot)}</div>
          </div>
          <button onClick={onClose} style={{ background: '#1e1e1e', border: 'none', color: '#555', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', aspectRatio: '1', background: '#0a0a0a',
            borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: preview ? 'none' : '1px dashed #2a2a2a',
          }}
        >
          {preview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ textAlign: 'center', color: '#3a3a3a', userSelect: 'none' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 12 }}>tap to pick a photo</div>
              </div>
          }
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }} />

        {error && <div style={{ color: '#e05555', fontSize: 13 }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          style={{
            background: file && !uploading ? '#ffffff' : '#1e1e1e',
            color: file && !uploading ? '#000000' : '#444',
            border: 'none', borderRadius: 10, padding: '14px 0',
            fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
            cursor: file && !uploading ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {uploading ? 'posting…' : 'post'}
        </button>
      </div>
    </div>
  )
}
