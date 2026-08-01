import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Abhyas — AI-Powered Mock Interview Platform',
  description:
    'Abhyas puts an AI interviewer across the table. Real questions. Instant feedback. No judgment. Practice until it feels natural.',
  openGraph: {
    title: 'Abhyas — AI-Powered Mock Interview Platform',
    description: 'Practice smarter. Interview better. Land the role.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body style={{ background: 'var(--v-page)', color: 'var(--v-tx0)' }}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
