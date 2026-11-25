import { activity } from './activities'
import { dateKey, monthCells } from './dates'
import type { Entry } from './types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_EMOJI = 6

/** One emoji per kind of activity, in the order they happened. */
function dayEmojis(entries: Entry[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const e of entries) {
    if (e.noEmoji || seen.has(e.activity)) continue
    seen.add(e.activity)
    out.push(activity(e.activity).emoji)
  }
  return out
}

export function Calendar({ year, month, today, entriesFor, hasNote, onPick }: {
  year: number
  month: number
  today: string
  entriesFor: (key: string) => Entry[]
  hasNote: (key: string) => boolean
  onPick: (key: string) => void
}) {
  return (
    <div className="calendar" role="grid" aria-label="Journal calendar">
      <div className="cal-row cal-head" role="row">
        {WEEKDAYS.map((d) => <div key={d} role="columnheader" className="cal-weekday">{d}</div>)}
      </div>
      <div className="cal-body">
        {monthCells(year, month).map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} className="cal-cell cal-blank" aria-hidden />
          const key = dateKey(year, month, day)
          const entries = entriesFor(key)
          const emojis = dayEmojis(entries)
          const future = key > today
          const label = `${day}${emojis.length ? ': ' + [...new Set(entries.map((e) => activity(e.activity).label))].join(', ') : ''}`
          return (
            <button
              key={key}
              role="gridcell"
              className={`cal-cell${key === today ? ' is-today' : ''}${future ? ' is-future' : ''}${emojis.length || hasNote(key) ? ' has-entries' : ''}`}
              onClick={() => onPick(key)}
              aria-label={label}
            >
              <span className="cal-num">{day}</span>
              <span className="cal-emojis" aria-hidden>
                {emojis.slice(0, MAX_EMOJI).map((e, j) => <span key={j}>{e}</span>)}
                {emojis.length > MAX_EMOJI && <span className="cal-more">+{emojis.length - MAX_EMOJI}</span>}
                {!emojis.length && hasNote(key) && <span>📝</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
