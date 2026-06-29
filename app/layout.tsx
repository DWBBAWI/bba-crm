import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Breakthrough Business Advisors — CRM',
  description: 'CRM and business operations for Breakthrough Business Advisors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
