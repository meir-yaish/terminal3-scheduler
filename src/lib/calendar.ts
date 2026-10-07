export type CalendarType = 'israel' | 'portugal'

// Israel: work days = Sun(0)–Thu(4), off = Fri(5) + Sat(6)
const ISRAEL_OFF_DAYS = new Set([5, 6])
// Portugal: work days = Mon(1)–Fri(5), off = Sat(6) + Sun(0)
const PORTUGAL_OFF_DAYS = new Set([0, 6])

// חגים מוסלמיים — עיד אל-פיטר ועיד אל-אדחא (3 ימים כל אחד)
export const MUSLIM_HOLIDAYS = new Set<string>([
  // עיד אל-פיטר 2025
  '2025-03-30', '2025-03-31', '2025-04-01',
  // עיד אל-אדחא 2025
  '2025-06-06', '2025-06-07', '2025-06-08',
  // עיד אל-פיטר 2026
  '2026-03-19', '2026-03-20', '2026-03-21',
  // עיד אל-אדחא 2026
  '2026-05-26', '2026-05-27', '2026-05-28',
  // עיד אל-פיטר 2027 — בתקופת ההרכבה!
  '2027-03-08', '2027-03-09', '2027-03-10',
  // עיד אל-אדחא 2027 — בתקופת ההרכבה!
  '2027-05-15', '2027-05-16', '2027-05-17',
])

// חגים יהודיים בלבד (לסימון גרפי)
export const JEWISH_HOLIDAYS = new Set<string>([
  // פסח תשפ"ה (2025)
  '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16',
  '2025-04-17', '2025-04-18', '2025-04-19',
  // יום העצמאות 2025
  '2025-04-30',
  // שבועות תשפ"ה
  '2025-06-01',
  // ראש השנה תשפ"ו
  '2025-09-22', '2025-09-23',
  // יום כיפור תשפ"ו
  '2025-10-01',
  // סוכות תשפ"ו (יום א')
  '2025-10-06',
  // שמיני עצרת תשפ"ו
  '2025-10-13',

  // פסח תשפ"ו (2026)
  '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',
  '2026-04-06', '2026-04-07', '2026-04-08',
  // יום העצמאות 2026
  '2026-04-22',
  // שבועות תשפ"ו
  '2026-05-21',
  // ראש השנה תשפ"ז
  '2026-09-11', '2026-09-12',
  // יום כיפור תשפ"ז
  '2026-09-20',
  // סוכות תשפ"ז (יום א')
  '2026-09-25',
  // שמיני עצרת תשפ"ז
  '2026-10-02',

  // פסח תשפ"ז (2027) — תקופת ההרכבה!
  '2027-04-21', '2027-04-22', '2027-04-23', '2027-04-24',
  '2027-04-25', '2027-04-26', '2027-04-27',
  // יום העצמאות 2027
  '2027-05-11',
  // שבועות תשפ"ז
  '2027-06-11',
  // ראש השנה תשפ"ח
  '2027-10-02', '2027-10-03',
])

const PORTUGAL_HOLIDAYS = new Set<string>([
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-25', '2025-05-01',
  '2025-06-10', '2025-06-19', '2025-08-15', '2025-10-05',
  '2025-11-01', '2025-12-01', '2025-12-08', '2025-12-25',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-25', '2026-05-01',
  '2026-06-04', '2026-06-10', '2026-08-15', '2026-10-05',
  '2026-11-01', '2026-12-01', '2026-12-08', '2026-12-25',
  // 2027
  '2027-01-01', '2027-03-26', '2027-04-25', '2027-05-01',
  '2027-05-27', '2027-06-10', '2027-08-15', '2027-10-05',
  '2027-11-01', '2027-12-01', '2027-12-08', '2027-12-25',
])

// Combined construction calendar: Jewish + Muslim holidays
const CONSTRUCTION_HOLIDAYS = new Set<string>([
  ...JEWISH_HOLIDAYS,
  ...MUSLIM_HOLIDAYS,
])

function toKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function isWorkingDay(d: Date, cal: CalendarType): boolean {
  const dow = d.getDay()
  if (cal === 'israel') {
    if (ISRAEL_OFF_DAYS.has(dow)) return false
    return !CONSTRUCTION_HOLIDAYS.has(toKey(d))
  } else {
    if (PORTUGAL_OFF_DAYS.has(dow)) return false
    return !PORTUGAL_HOLIDAYS.has(toKey(d))
  }
}

// Count Mon-Fri working days between start (inclusive) and end (exclusive)
// Used to extract implied duration from manually-set seed dates
export function countMonFriDays(start: Date, end: Date): number {
  let count = 0
  const d = new Date(start)
  while (d < end) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// Advance to first working day on or after d
export function nextWorkingDay(d: Date, cal: CalendarType): Date {
  const result = new Date(d)
  while (!isWorkingDay(result, cal)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

// Returns endDate (exclusive) after N working days starting from startDate (inclusive)
// endDate = day AFTER the last working day
export function addWorkingDays(start: Date, days: number, cal: CalendarType): Date {
  if (days <= 0) return new Date(start)
  const d = new Date(start)
  let counted = 0
  // Start counting from start itself
  while (true) {
    if (isWorkingDay(d, cal)) {
      counted++
      if (counted === days) {
        // Last working day found; advance one calendar day for exclusive endDate
        d.setDate(d.getDate() + 1)
        return d
      }
    }
    d.setDate(d.getDate() + 1)
  }
}

export function calendarForResponsible(responsible: string): CalendarType {
  if (responsible.includes('קלריאו') || responsible.includes('קלריאר')) return 'portugal'
  return 'israel'
}
