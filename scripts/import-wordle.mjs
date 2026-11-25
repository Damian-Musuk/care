#!/usr/bin/env node
/**
 * Copies new screenshots from Damian's shared iCloud Wordle album into the journal.
 * Run by .github/workflows/wordle.yml every few hours; can also be run by hand: npm run import-wordle
 *
 * Writes:  public/wordle/<date>-<id>.jpg   and   public/data/wordle.json
 * Each photo lands on the day it was taken, in Perth time.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ALBUM_TOKEN = process.env.WORDLE_ALBUM_TOKEN
  || 'D1pv3vokfjNItEiwy6Dy3wsHEOQCAEQARogOela2MdlhIVNgqHsvd5piKd_LXaJh-A9I78Gj7i_raI'
const TIME_ZONE = 'Australia/Perth'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = join(root, 'public/data/wordle.json')
const imageDir = join(root, 'public/wordle')

const FALLBACK_HOST = 'p23-sharedstreams.icloud.com'
const BASE62 ='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const base62 = (s) => [...s].reduce((n, c) => n * 62 + BASE62.indexOf(c), 0)

/** iCloud spreads albums over servers p01…p99; the token says which one, and a 330 reply corrects it. */
function firstHost(token) {
  const n = token[0] === 'A' ? base62(token[1]) : base62(token.slice(1, 3))
  return n >= 1 && n <= 99 ? `p${String(n).padStart(2, '0')}-sharedstreams.icloud.com` : FALLBACK_HOST
}

async function post(host, endpoint, body) {
  for (let hop = 0; hop < 4; hop++) {
    let res
    try {
      res = await fetch(`https://${host}/${ALBUM_TOKEN}/sharedstreams/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', Origin: 'https://www.icloud.com' },
        body: JSON.stringify(body),
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      })
    } catch (e) {
      console.warn(`  ${host}: ${e.message}`)
      // Newer album links don't always map to a real server; any server will redirect us to the right one.
      if (host === FALLBACK_HOST) throw e
      console.warn(`${host} unreachable, asking ${FALLBACK_HOST} instead`)
      host = FALLBACK_HOST
      continue
    }
    if (res.status === 330) {
      const json = await res.json().catch(() => ({}))
      const next = json['X-Apple-MMe-Host'] || res.headers.get('X-Apple-MMe-Host')
      if (!next) throw new Error('iCloud asked to redirect but gave no server')
      host = next
      continue
    }
    console.log(`  ${host} ${endpoint}: HTTP ${res.status}`)
    if (!res.ok) throw new Error(`iCloud ${endpoint}: HTTP ${res.status}`)
    return { host, json: await res.json() }
  }
  throw new Error('iCloud redirected too many times')
}

function perthDate(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

async function main() {
  const data = JSON.parse(await readFile(dataPath, 'utf8').catch(() => '{"photos":{},"hidden":[]}'))
  data.photos ??= {}
  data.hidden ??= []

  console.log(`Asking iCloud for the album…`)
  const stream = await post(firstHost(ALBUM_TOKEN), 'webstream', { streamCtag: null })
  const host = stream.host
  const all = stream.json.photos ?? []
  const fresh = all.filter((p) => p.mediaAssetType !== 'video' && !data.photos[p.photoGuid])
  console.log(`Album "${stream.json.streamName ?? '?'}": ${all.length} items, ${fresh.length} new`)
  if (!fresh.length) return

  await mkdir(imageDir, { recursive: true })
  let added = 0
  for (let i = 0; i < fresh.length; i += 25) {
    const batch = fresh.slice(i, i + 25)
    const { json: urls } = await post(host, 'webasseturls', { photoGuids: batch.map((p) => p.photoGuid) })
    for (const photo of batch) {
      // Pick the largest picture iCloud offers.
      const best = Object.values(photo.derivatives ?? {})
        .sort((a, b) => Number(b.fileSize ?? 0) - Number(a.fileSize ?? 0))[0]
      const loc = best && urls.items?.[best.checksum]
      if (!loc) { console.warn(`No download for ${photo.photoGuid}`); continue }
      const res = await fetch(`https://${loc.url_location}${loc.url_path}`, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) { console.warn(`Download failed for ${photo.photoGuid}: HTTP ${res.status}`); continue }

      const date = perthDate(photo.dateCreated ?? photo.batchDateCreated)
      const id = photo.photoGuid.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toLowerCase()
      const file = `wordle/${date}-${id}.jpg`
      await writeFile(join(root, 'public', file), Buffer.from(await res.arrayBuffer()))
      data.photos[photo.photoGuid] = { date, file, ...(photo.caption?.trim() && { caption: photo.caption.trim() }) }
      added++
      console.log(`  + ${file}`)
    }
  }

  // Keep the file in date order so the diffs read nicely.
  data.photos = Object.fromEntries(Object.entries(data.photos).sort(([, a], [, b]) => a.date.localeCompare(b.date)))
  await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n')
  console.log(`Added ${added} Wordle screenshot(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
