/** Where the journal lives. The editor saves straight into this GitHub repo. */
export const REPO_OWNER = 'Damian-Musuk'
export const REPO_NAME = 'care'
export const BRANCH = 'main'

export const JOURNAL_PATH = 'public/data/journal.json'
export const WORDLE_PATH = 'public/data/wordle.json'

/** Days start and end in Perth time. */
export const TIME_ZONE = 'Australia/Perth'

/** Health data sent by the iPhone Shortcut, one file per activity per month: "steps-2026-11.json" in public/data/. Month is 0-11. */
export function activityFileName(activity: string, year: number, month: number) {
  return `${activity}-${year}-${String(month + 1).padStart(2, '0')}.json`
}
/** 👟 shows on the calendar on days with at least this many steps. */
export const STEP_GOAL = 10000
