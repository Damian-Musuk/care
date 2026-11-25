#!/usr/bin/env node
/**
 * Saves every Wordle answer to public/data/wordle-answers.json as { "YYYY-MM-DD": "WORD" },
 * from https://wordfinder.yourdictionary.com/wordle/answers/ (one page, every answer since #0).
 * Each row is "date | Wordle # | answer"; the date is worked out from the number (#0 was 19 June 2021),
 * which avoids parsing "Nov. 25" style dates with no year.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL = 'https://wordfinder.yourdictionary.com/wordle/answers/'
const out = join(dirname(fileURLToPath(import.meta.url)), '../public/data/wordle-answers.json')

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

export function parseAnswers(html) {
  const answers = {}
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]))
    if (cells.length < 3) continue
    const n = Number.parseInt(cells[1], 10)
    const words = cells[2].toUpperCase().match(/\b[A-Z]{5}\b/g)
    if (Number.isNaN(n) || !words) continue
    const day = new Date(Date.UTC(2021, 5, 19 + n)).toISOString().slice(0, 10)
    answers[day] = words[words.length - 1]
  }
  return answers
}

async function main() {
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (care.damian-mus.uk journal)' }, signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`WordFinder: HTTP ${res.status}`)
  const found = parseAnswers(await res.text())
  const count = Object.keys(found).length
  if (count < 1000) throw new Error(`Only found ${count} answers; the page layout may have changed`)
  const old = JSON.parse(await readFile(out, 'utf8').catch(() => '{}'))
  const merged = Object.fromEntries(Object.entries({ ...old, ...found }).sort(([a], [b]) => b.localeCompare(a)))
  await writeFile(out, JSON.stringify(merged, null, 0).replace(/,"/g, ',\n"') + '\n')
  console.log(`Saved ${Object.keys(merged).length} Wordle answers (newest ${Object.keys(merged)[0]}).`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.log(`::warning::Couldn't update Wordle answers: ${e.message}`)
  })
}
