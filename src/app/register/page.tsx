'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      return
    }

    router.push('/grid')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>hourly</div>
        <p style={styles.sub}>create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <input
              style={styles.input}
              type="text"
              placeholder="username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <p style={styles.hint}>3–32 characters, letters/numbers/underscores</p>
          </div>
          <input
            style={styles.input}
            type="password"
            placeholder="password (min 6 chars)"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'creating account…' : 'create account'}
          </button>
        </form>

        <p style={styles.foot}>
          have an account?{' '}
          <Link href="/login" style={styles.link}>
            sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.02em',
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: '#444',
    marginBottom: 32,
    letterSpacing: '0.04em',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    width: '100%',
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: 8,
    padding: '13px 14px',
    fontSize: 14,
    color: '#e0e0e0',
    outline: 'none',
  },
  hint: {
    fontSize: 11,
    color: '#383838',
    marginTop: 5,
    marginLeft: 2,
  },
  error: {
    fontSize: 13,
    color: '#e05555',
    marginTop: 2,
  },
  btn: {
    width: '100%',
    background: '#ffffff',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '14px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.02em',
  },
  foot: {
    marginTop: 20,
    fontSize: 13,
    color: '#444',
  },
  link: {
    color: '#888',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
}
