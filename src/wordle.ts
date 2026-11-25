/** Wordle rules and numbering. */

const FIRST_WORDLE = Date.UTC(2021, 5, 19) // #0, CIGAR

export function wordleNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - FIRST_WORDLE) / 86_400_000)
}

export type Mark = 'G' | 'Y' | 'B'

/** The colours Wordle gives a guess: G green (right place), Y yellow (wrong place), B grey (not in it). */
export function score(guess: string, answer: string): Mark[] {
  const result: Mark[] = Array(5).fill('B')
  const left = new Map<string, number>()
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) result[i] = 'G'
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1)
  }
  for (let i = 0; i < 5; i++) {
    const n = left.get(guess[i]) ?? 0
    if (result[i] !== 'G' && n > 0) {
      result[i] = 'Y'
      left.set(guess[i], n - 1)
    }
  }
  return result
}

/** Turns typed text into guesses: one word per line (or separated by spaces/commas), letters only. */
export function parseGuesses(text: string): { guesses: string[]; problem?: string } {
  const guesses = text.toUpperCase().split(/[\s,]+/).map((w) => w.replace(/[^A-Z]/g, '')).filter(Boolean)
  const bad = guesses.find((g) => g.length !== 5)
  if (bad) return { guesses, problem: `“${bad}” isn't five letters.` }
  if (guesses.length > 6) return { guesses, problem: 'Wordle only has six rows.' }
  return { guesses }
}

export const ARCHIVE_URL = 'https://wordfinder.yourdictionary.com/wordle/answers/'
