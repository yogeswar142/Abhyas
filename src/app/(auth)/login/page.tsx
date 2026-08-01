'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error)
      setIsLoading(false)
      return
    }

    const redirect = searchParams.get('redirect') ?? '/dashboard'
    router.push(redirect)
    router.refresh()
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
    }}>
      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
      }}>
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--text-0)',
          marginBottom: '0.375rem',
        }}>Welcome back</h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-2)',
          marginBottom: '1.75rem',
        }}>Sign in to continue practicing.</p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            color: '#EF4444',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--text-1)',
              marginBottom: '0.4rem',
            }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.875rem',
                fontSize: '0.875rem',
                color: 'var(--text-0)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--text-1)',
              marginBottom: '0.4rem',
            }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.875rem',
                fontSize: '0.875rem',
                color: 'var(--text-0)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.7rem',
              background: isLoading ? 'var(--accent-hv)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'background 0.2s, opacity 0.2s',
              marginTop: '0.25rem',
            }}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p style={{
        textAlign: 'center',
        marginTop: '1.25rem',
        fontSize: '0.83rem',
        color: 'var(--text-2)',
      }}>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
          Create one
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
