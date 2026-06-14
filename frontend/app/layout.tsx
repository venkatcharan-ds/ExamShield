import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ExamShield — Privacy-First AI Exam Integrity',
  description:
    'No camera. No surveillance. AI that understands behavior to detect exam dishonesty without invading student privacy.',
  keywords: ['exam proctoring', 'AI integrity', 'privacy-first', 'behavioral analysis'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
