/** A photo stored in the repo under public/. Paths are relative to the site root, e.g. "photos/2026/11/abc.jpg". */
export interface Photo {
  src: string
  thumb?: string
}

export interface Entry {
  id: string
  activity: string
  title?: string
  note?: string
  link?: string
  photos?: Photo[]
  /** Added by the Wordle importer, not typed in by hand. */
  auto?: boolean
  /** Set on the day's Wordle entry, which is built from the screenshot and/or typed guesses. */
  wordle?: WordleDay
  /** Set on the day's activity rings entry. */
  rings?: Rings
  /** Don't show this entry's emoji on the calendar (rings that weren't all closed). */
  noEmoji?: boolean
}

export interface WordleDay {
  date: string
  guesses: string[]
  /** Unknown until WordFinder publishes it. */
  answer?: string
  /** The guesses were typed in, rather than read off the screenshot. */
  typed: boolean
  screenshot?: Photo
  /** Album photo id, so the screenshot can be hidden. */
  guid?: string
}

export interface Day {
  note?: string
  /** Wordle guesses typed in by hand, one five-letter word per guess. Overrides the screenshot. */
  wordle?: string[]
  /** Apple Watch activity rings, sent from the "Care rings" iPhone Shortcut. */
  rings?: Rings
  entries: Entry[]
}

export interface Rings {
  move: number
  moveGoal: number
  /** "kJ" or "kcal", whatever the Health app uses. */
  moveUnit: string
  exercise: number
  exerciseGoal: number
  stand: number
  standGoal: number
}

/** public/data/journal.json: everything typed in on the site. Keys are local dates, "YYYY-MM-DD". */
export interface Journal {
  version: 1
  days: Record<string, Day>
}

/** public/data/wordle.json: written by scripts/import-wordle.mjs from the shared iCloud album. */
export interface WordleData {
  photos: Record<string, { date: string; file: string; caption?: string; guesses?: string[]; answer?: string }>
  /** Album photos the editor chose to hide. */
  hidden?: string[]
}
