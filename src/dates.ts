import { TIME_ZONE } from './config'

/** Today's date in Perth as "YYYY-MM-DD". */
export function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

/** "Wednesday 25 November 2026" */
export function longDate(key: string): string {
  const { year, month, day } = parseKey(key)
  return new Date(Date.UTC(year, month, day)).toLocaleDateString('en-AU', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** "November 2026" */
export function monthTitle(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-AU', { timeZone: 'UTC', month: 'long', year: 'numeric' })
}

/** Cells for a Monday-first month grid; null for the blanks before the 1st and after the last day. */
export function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay() // 0 = Sunday
  const lead = (first + 6) % 7
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (number | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  return cells
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}
