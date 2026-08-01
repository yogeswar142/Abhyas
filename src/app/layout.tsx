import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
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
    <html lang="en" className="scroll-smooth">
      <body className="bg-canvas text-ink font-sans antialiased overflow-x-hidden">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
