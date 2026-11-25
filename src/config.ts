/** Where the journal lives. The editor saves straight into this GitHub repo. */
export const REPO_OWNER = 'Damian-Musuk'
export const REPO_NAME = 'care'
export const BRANCH = 'main'

export const JOURNAL_PATH = 'public/data/journal.json'
export const WORDLE_PATH = 'public/data/wordle.json'

/** Days start and end in Perth time. */
export const TIME_ZONE = 'Australia/Perth'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** Daily step counts sent by the iPhone Shortcut, one file per month: "steps-January-2026.json" in public/data/. Month is 0-11. */
export function stepsFileName(year: number, month: number) {
  return `steps-${MONTH_NAMES[month]}-${year}.json`
}
/** 👟 shows on the calendar on days with at least this many steps. */
export const STEP_GOAL = 10000
