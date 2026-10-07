'use client'
import { useState } from 'react'
import Link from 'next/link'
import CostAnalysisGate from '@/components/CostAnalysisGate'
import { ReportPageInner } from '../report/page'
import { ProfitLossPageInner } from '../pnl/page'
import { CostAnalysisPageInner } from '../cost-analysis/page'
import { BudgetPageInner } from '../budget/page'
import { QuoteCheckPageInner } from '../quote-check/page'

const TABS = [
  { key: 'report', label: '📊 דוח מנכ״ל' },
  { key: 'pnl', label: '📈 רווח והפסד' },
  { key: 'cost', label: '💼 עלות מול תקציב' },
  { key: 'budget', label: '📋 תקציב לפי סעיף' },
  { key: 'quote', label: '🧮 בדיקת הצעת מחיר' },
] as const

type TabKey = typeof TABS[number]['key']

export default function FinancePage() {
  return <CostAnalysisGate><FinancePageInner /></CostAnalysisGate>
}

function FinancePageInner() {
  const [tab, setTab] = useState<TabKey>('report')

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', background: '#EFF2F5', minHeight: '100vh' }}>
      <div className="no-print" style={{ background: '#111', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/" style={{ color: '#9DC3E6', fontSize: 14, textDecoration: 'none' }}>← חזרה ללוח הזמנים</Link>
        <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: tab === t.key ? 700 : 400,
                background: tab === t.key ? '#1F3864' : 'white',
                color: tab === t.key ? 'white' : '#444',
                border: `1.5px solid ${tab === t.key ? '#1F3864' : '#D1D5DB'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'report' && <ReportPageInner />}
      {tab === 'pnl' && <ProfitLossPageInner />}
      {tab === 'cost' && <CostAnalysisPageInner />}
      {tab === 'budget' && <BudgetPageInner />}
      {tab === 'quote' && <QuoteCheckPageInner />}
    </div>
  )
}
