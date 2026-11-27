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
