import type { Rings } from './types'

export function ringsClosed(r: Rings): boolean {
  return r.move >= r.moveGoal && r.exercise >= r.exerciseGoal && r.stand >= r.standGoal
}

/**
 * Reads rings sent by the Shortcut in the address, e.g.
 * ?rings=2026-11-25&move=2597&moveGoal=2120&unit=kJ&exercise=60&exerciseGoal=30&stand=14&standGoal=12
 */
export function ringsFromUrl(search: string): { date: string; rings: Rings } | null {
  const p = new URLSearchParams(search)
  const date = p.get('rings')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const num = (k: string) => {
    // Shortcuts may write "2,597.94" or "2597,94" depending on the phone's region.
    let t = (p.get(k) ?? '').replace(/[^\d.,]/g, '')
    if (t.includes('.')) t = t.replace(/,/g, '')
    else if (/,\d{3}$/.test(t)) t = t.replace(/,/g, '')
    else t = t.replace(',', '.')
    const v = Number.parseFloat(t)
    return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0
  }
  return {
    date,
    rings: {
      move: num('move'), moveGoal: num('moveGoal'), moveUnit: p.get('unit') || 'kJ',
      exercise: num('exercise'), exerciseGoal: num('exerciseGoal'),
      stand: num('stand'), standGoal: num('standGoal'),
    },
  }
}
