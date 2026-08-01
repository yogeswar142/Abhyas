import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in — Abhyas',
  description: 'Sign in to your Abhyas account',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-0)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Brand mark */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
        }}>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-0)',
          }}>Abhyas</span>
        </a>
      </div>
      {children}
    </div>
  )
}
