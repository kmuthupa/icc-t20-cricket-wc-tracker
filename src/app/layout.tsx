import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ICC T20 World Cup 2026 Tracker',
  description: 'Live standings, results, and fixtures for ICC T20 World Cup 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
