import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'לוח זמנים - טרמינל סנטר 3',
  description: 'מערכת ניהול לוח זמנים לפרויקט קיר מסך',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>{children}</body>
    </html>
  )
}
