import { shortcutDateKey } from './dates'

/** Monthly files the iPhone Shortcut sends, e.g. public/data/move-2026-11.json. */
export const HEALTH_ACTIVITIES = ['steps', 'move', 'exercise', 'stand'] as const
export type HealthActivity = (typeof HEALTH_ACTIVITIES)[number]

/** Daily ring goals (the files don't carry them). Move is in kJ. */
export const RING_GOALS = { move: 2120, moveUnit: 'kJ', exercise: 30, stand: 12 }

/** Stand days from before the Shortcut sent hourly data count as a full 12 hours. */
const ASSUMED_STAND_HOURS = 12

/**
 * Turns one monthly file into { "YYYY-MM-DD": value }.
 * Steps, move and exercise are summed per day. Stand comes in minutes: when the file is grouped by
 * hour (some day has more than one entry), each hour with at least a minute counts as a stand hour,
 * like the watch; a file grouped by day only says a day had standing, so it counts as 12 hours.
 */
export function parseHealthFile(activity: HealthActivity, list: unknown): Record<string, number> {
  const perDay = new Map<string, number[]>()
  for (const d of Array.isArray(list) ? list : []) {
    const date = d && shortcutDateKey(d.date)
    const v = d ? Number.parseFloat(String(d[activity]).replace(/,/g, '')) : NaN
    if (!date || !Number.isFinite(v)) continue
    perDay.set(date, [...(perDay.get(date) ?? []), v])
  }
  const hourly = activity === 'stand' && [...perDay.values()].some((vs) => vs.length > 1)
  const out: Record<string, number> = {}
  for (const [date, vs] of perDay) {
    if (activity !== 'stand') out[date] = Math.round(vs.reduce((a, b) => a + b, 0) * 10) / 10
    else if (hourly) out[date] = Math.min(24, vs.filter((v) => v >= 1).length)
    else out[date] = ASSUMED_STAND_HOURS
  }
  return out
}

/** The first day the Shortcut sent one file per day (public/data/activity-2026-11-27.json). Earlier days only have monthly files. */
export const DAILY_FILES_FROM = '2026-11-27'

export function dailyFileName(date: string) {
  return `activity-${date}.json`
}

/** Health names the Shortcut writes in the daily file, matched loosely ("Active Calories" → move). */
function activityFromLabel(label: string): HealthActivity | null {
  const l = label.toLowerCase()
  if (l.includes('step')) return 'steps'
  if (l.includes('stand')) return 'stand'
  if (l.includes('exercise')) return 'exercise'
  if (l.includes('calor') || l.includes('energy') || l.includes('move')) return 'move'
  return null
}

/**
 * Reads a daily file: hourly rows like {"date" : "27 Nov 2026 at 9:00 am", "Steps" : "770"} for each activity.
 * Read line by line rather than as JSON, so a stray quote or colon from the Shortcut's text doesn't lose the day.
 * Only rows on `date` count (the Shortcut also adds midnight of the next day). Stand is minutes per hour:
 * every hour with at least a minute is a stand hour.
 */
export function parseDailyFile(date: string, text: string): Partial<Record<HealthActivity, number>> {
  const totals: Partial<Record<HealthActivity, number>> = {}
  const row = /"date"\s*:\s*"([^"]+)"\s*[,:]\s*"([^"]+)"\s*:\s*"?([-\d.,]+)/
  for (const line of text.split(/\r?\n|\},\s*\{/)) {
    const m = row.exec(line)
    if (!m || shortcutDateKey(m[1]) !== date) continue
    const activity = activityFromLabel(m[2])
    const v = Number.parseFloat(m[3].replace(/,/g, ''))
    if (!activity || !Number.isFinite(v)) continue
    totals[activity] = (totals[activity] ?? 0) + (activity === 'stand' ? (v >= 1 ? 1 : 0) : v)
  }
  for (const k of Object.keys(totals) as HealthActivity[]) totals[k] = Math.round(totals[k]! * 10) / 10
  return totals
}
