import { ringsClosed } from './ringsData'
import type { Rings } from './types'

/** Three concentric rings like the Activity app: Move (red), Exercise (green), Stand (blue). */
function RingsPicture({ rings }: { rings: Rings }) {
  const parts = [
    { value: rings.move, goal: rings.moveGoal, colour: '#fa114f', track: 'rgba(250,17,79,0.22)', r: 42 },
    { value: rings.exercise, goal: rings.exerciseGoal, colour: '#92e82a', track: 'rgba(146,232,42,0.22)', r: 30 },
    { value: rings.stand, goal: rings.standGoal, colour: '#1eeaef', track: 'rgba(30,234,239,0.22)', r: 18 },
  ]
  return (
    <svg viewBox="0 0 100 100" className="rings-svg" aria-hidden>
      <circle cx="50" cy="50" r="50" fill="#000" />
      {parts.map((p) => {
        const c = 2 * Math.PI * p.r
        const frac = p.goal > 0 ? p.value / p.goal : 0
        // Past 100% the ring keeps going round; draw the extra lap on top.
        const laps = Math.min(frac, 3)
        return (
          <g key={p.r} transform="rotate(-90 50 50)">
            <circle cx="50" cy="50" r={p.r} fill="none" stroke={p.track} strokeWidth="10" />
            {laps > 0 && (
              <circle cx="50" cy="50" r={p.r} fill="none" stroke={p.colour} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${Math.min(laps, 1) * c} ${c}`} />
            )}
            {laps > 1 && (
              <circle cx="50" cy="50" r={p.r} fill="none" stroke={p.colour} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(laps - Math.floor(laps) || 1) * c} ${c}`} style={{ filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,.8))' }} />
            )}
          </g>
        )
      })}
    </svg>
  )
}

const n = (v: number) => Math.round(v).toLocaleString('en-AU')

export function RingsCard({ rings }: { rings: Rings }) {
  return (
    <li className="entry rings-card">
      <div className="entry-emoji" aria-hidden>⭕</div>
      <div className="entry-body">
        <div className="entry-kind">Activity</div>
        <h3 className="entry-title">{ringsClosed(rings) ? 'All rings closed' : 'Activity rings'}</h3>
        <div className="rings-layout">
          <RingsPicture rings={rings} />
          <dl className="rings-numbers">
            <div><dt className="ring-move">Move</dt><dd>{n(rings.move)} / {n(rings.moveGoal)} {rings.moveUnit}</dd></div>
            <div><dt className="ring-exercise">Exercise</dt><dd>{n(rings.exercise)} / {n(rings.exerciseGoal)} min</dd></div>
            <div><dt className="ring-stand">Stand</dt><dd>{n(rings.stand)} / {n(rings.standGoal)} hr</dd></div>
          </dl>
        </div>
        <p className="muted small">From Apple Health.</p>
      </div>
    </li>
  )
}
