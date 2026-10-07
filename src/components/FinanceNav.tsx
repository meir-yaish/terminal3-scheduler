'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function FinanceNav() {
  const pathname = usePathname()
  if (pathname === '/finance') return null
  return (
    <Link href="/finance" className="no-print"
      style={{ background: '#7030A0', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
      💰 כספים
    </Link>
  )
}
