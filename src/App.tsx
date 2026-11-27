import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVITIES } from './activities'
import { Calendar } from './Calendar'
import { BRANCH, REPO_NAME, REPO_OWNER, STEP_GOAL, activityFileName } from './config'
import { addMonths, dateKey, longDate, monthTitle, parseKey, todayKey } from './dates'
import { DayView } from './DayView'
import { EditorSetup } from './EditorSetup'
import { EntryForm, type EntryDraft } from './EntryForm'
import { explain, getToken, loadLatest, save, setToken as storeToken, type Change } from './github'
import { newId } from './images'
import { Lightbox } from './Lightbox'
import { ringsClosed, ringsFromUrl } from './ringsData'
import { HEALTH_ACTIVITIES, RING_GOALS, parseHealthFile, type HealthActivity } from './healthData'
import type { Entry, Journal, Photo, Rings, WordleData, WordleDay } from './types'

const EMPTY_JOURNAL: Journal = { version: 1, days: {} }
const EMPTY_WORDLE: WordleData = { photos: {}, hidden: [] }
/** The address as it first arrived, before the month/day sync rewrites it (keeps rings from the Shortcut). */
const START_SEARCH = location.search

function readUrl() {
  const p = new URLSearchParams(location.search)
  const today = parseKey(todayKey())
  const m = p.get('m')?.match(/^(\d{4})-(\d{2})$/)
  const d = p.get('d')
  const fromDay = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseKey(d) : null
  return {
    year: m ? +m[1] : fromDay?.year ?? today.year,
    month: m ? +m[2] - 1 : fromDay?.month ?? today.month,
    day: fromDay ? d! : null,
  }
}

export default function App() {
  const [initial] = useState(readUrl)
  // Rings sent by the iPhone Shortcut, waiting to be saved.
  const [incomingRings, setIncomingRings] = useState(() => ringsFromUrl(location.search))
  const [journal, setJournal] = useState<Journal>(EMPTY_JOURNAL)
  const [wordle, setWordle] = useState<WordleData>(EMPTY_WORDLE)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [health, setHealth] = useState<Partial<Record<HealthActivity, Record<string, number>>>>({})
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [token, setTokenState] = useState<string | null>(getToken)
  const [view, setView] = useState(() => incomingRings ? { year: +incomingRings.date.slice(0, 4), month: +incomingRings.date.slice(5, 7) - 1 } : { year: initial.year, month: initial.month })
  const [selected, setSelected] = useState<string | null>(incomingRings?.date ?? initial.day)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [saveError, setSaveError] = useState('')
  const today = todayKey()
  const editing = !!token

  // Load: the published files for everyone; the newest versions straight from GitHub for the editor.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (token) {
          const latest = await loadLatest(token)
          if (cancelled) return
          setJournal(latest.journal)
          setWordle(latest.wordle)
        } else {
          const [j, w] = await Promise.all([
            fetch('/data/journal.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : EMPTY_JOURNAL)),
            fetch('/data/wordle.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : EMPTY_WORDLE)).catch(() => EMPTY_WORDLE),
          ])
          if (cancelled) return
          setJournal(j)
          setWordle(w)
        }
        setLoadError('')
      } catch (e) {
        if (!cancelled) setLoadError(`Couldn't load the journal: ${(e as Error).message}`)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    fetch('/data/wordle-answers.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then(setAnswers)
      .catch(() => {})
  }, [])

  // Health data from the iPhone Shortcut: one file per activity per month (public/data/steps-2026-11.json,
  // move-…, exercise-…, stand-…). Loads the month on screen plus the months either side, so swiping across
  // a month edge has them. The editor reads GitHub directly so a fresh upload shows at once.
  const healthFiles = useRef(new Set<string>())
  useEffect(() => {
    for (const d of [-1, 0, 1]) {
      const m = addMonths(view.year, view.month, d)
      for (const activity of HEALTH_ACTIVITIES) {
        const name = activityFileName(activity, m.year, m.month)
        const key = `${token ? 'github' : 'site'}:${name}`
        if (healthFiles.current.has(key)) continue
        healthFiles.current.add(key)
        const url = token
          ? `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/public/data/${name}`
          : `/data/${name}`
        fetch(url, { cache: 'no-cache' })
          .then((r) => (r.ok ? r.json() : []))
          .then((list) => {
            const found = parseHealthFile(activity, list)
            if (Object.keys(found).length) setHealth((h) => ({ ...h, [activity]: { ...h[activity], ...found } }))
          })
          .catch(() => healthFiles.current.delete(key))
      }
    }
  }, [view, token])

  // Keep the address in step so a link to a month or a day can be shared.
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('m', `${view.year}-${String(view.month + 1).padStart(2, '0')}`)
    if (selected) p.set('d', selected)
    history.replaceState(null, '', `${location.pathname}?${p}`)
  }, [view, selected])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), toast.startsWith("Couldn't") ? 10000 : 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Photos saved in the last minute aren't on the live site yet, so the editor reads them from GitHub.
  const photoUrl = useCallback((path: string) =>
    editing ? `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/public/${path}` : `/${path}`, [editing])

  // One Wordle per day: typed guesses win, then a screenshot that was read, then any screenshot.
  const wordleByDate = useMemo(() => {
    const hidden = new Set(wordle.hidden ?? [])
    const byDate = new Map<string, WordleDay>()
    for (const [guid, w] of Object.entries(wordle.photos)) {
      if (hidden.has(guid)) continue
      const existing = byDate.get(w.date)
      if (existing && (existing.guesses.length || !w.guesses)) continue
      byDate.set(w.date, { date: w.date, guesses: w.guesses ?? [], answer: w.answer, typed: false, screenshot: { src: w.file }, guid })
    }
    for (const [date, day] of Object.entries(journal.days)) {
      if (!day.wordle?.length) continue
      const shot = byDate.get(date)
      byDate.set(date, { date, guesses: day.wordle, typed: true, screenshot: shot?.screenshot, guid: shot?.guid })
    }
    const map = new Map<string, Entry>()
    for (const [date, info] of byDate) {
      info.answer = answers[date] ?? info.answer
      map.set(date, { id: `wordle:${date}`, activity: 'puzzle', title: 'Wordle', auto: true, wordle: info })
    }
    return map
  }, [wordle, journal, answers])

  const entriesFor = useCallback((key: string) => {
    const w = wordleByDate.get(key)
    // Rings saved from the Shortcut link win; otherwise build them from the monthly files.
    const move = health.move?.[key], exercise = health.exercise?.[key], stand = health.stand?.[key]
    const fromFiles: Rings | undefined = move !== undefined || exercise !== undefined || stand !== undefined
      ? { move: move ?? 0, moveGoal: RING_GOALS.move, moveUnit: RING_GOALS.moveUnit, exercise: exercise ?? 0, exerciseGoal: RING_GOALS.exercise, stand: stand ?? 0, standGoal: RING_GOALS.stand }
      : undefined
    const r = journal.days[key]?.rings ?? fromFiles
    const rings: Entry[] = r ? [{ id: `rings:${key}`, activity: 'rings', auto: true, rings: r, noEmoji: !ringsClosed(r) }] : []
    const n = health.steps?.[key] === undefined ? undefined : Math.round(health.steps[key])
    const walked: Entry[] = n !== undefined
      ? [{ id: `steps:${key}`, activity: 'steps', auto: true, steps: n, title: `${n.toLocaleString('en-AU')} steps`, note: n >= STEP_GOAL ? 'Step goal reached.' : `Goal is ${STEP_GOAL.toLocaleString('en-AU')}.`, noEmoji: n < STEP_GOAL }]
      : []
    return [...rings, ...walked, ...(w ? [w] : []), ...(journal.days[key]?.entries ?? [])]
  }, [journal, wordleByDate, health])

  const hasNote = useCallback((key: string) => !!journal.days[key]?.note, [journal])

  async function run(change: Change, done: string) {
    if (!token) return false
    setBusy(true)
    try {
      setSaveError('')
      const result = await save(token, change)
      setJournal(result.journal)
      setWordle(result.wordle)
      setToast(`${done} Everyone will see it in about a minute.`)
      return true
    } catch (e) {
      const message = `Couldn't save. ${explain(e)}`
      setSaveError(message)
      setToast(message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveEntry(date: string, draft: EntryDraft) {
    const [y, m] = date.split('-')
    const added: Photo[] = draft.newPhotos.map((p) => ({
      src: `photos/${y}/${m}/${p.id}.jpg`,
      thumb: `photos/${y}/${m}/${p.id}.thumb.jpg`,
    }))
    const entry: Entry = { ...draft.entry }
    if (added.length) entry.photos = [...(entry.photos ?? []), ...added]
    const ok = await run({
      message: `${date}: ${entry.title ?? entry.activity}`,
      addFiles: draft.newPhotos.flatMap((p, i) => [
        { path: `public/${added[i].src}`, base64: p.full },
        { path: `public/${added[i].thumb}`, base64: p.thumb },
      ]),
      deleteFiles: draft.removedPhotos.flatMap((p) => [p.src, p.thumb].filter(Boolean).map((s) => `public/${s}`)),
      journal: (j) => {
        const day = j.days[date] ?? { entries: [] }
        const i = day.entries.findIndex((e) => e.id === entry.id)
        if (i >= 0) day.entries[i] = entry
        else day.entries.push(entry)
        j.days[date] = day
        return j
      },
    }, 'Saved.')
    if (ok) {
      draft.newPhotos.forEach((p) => URL.revokeObjectURL(p.preview))
      setEditingEntry(null)
    }
  }

  function deleteEntry(date: string, entry: Entry) {
    if (!confirm(`Delete “${entry.title ?? 'this entry'}”${entry.photos?.length ? ' and its photos' : ''}?`)) return
    run({
      message: `${date}: delete ${entry.title ?? entry.activity}`,
      deleteFiles: (entry.photos ?? []).flatMap((p) => [p.src, p.thumb].filter(Boolean).map((s) => `public/${s}`)),
      journal: (j) => {
        const day = j.days[date]
        if (!day) return j
        day.entries = day.entries.filter((e) => e.id !== entry.id)
        if (!day.entries.length && !day.note && !day.wordle && !day.rings) delete j.days[date]
        return j
      },
    }, 'Deleted.')
  }

  function hideWordle(date: string, entry: Entry) {
    const guid = entry.wordle?.guid
    if (!guid || !confirm('Hide this Wordle screenshot from the journal?')) return
    run({
      message: `${date}: hide a Wordle`,
      wordle: (w) => ({ ...w, hidden: [...new Set([...(w.hidden ?? []), guid])] }),
    }, 'Hidden.')
  }

  function saveWordle(date: string, guesses: string[] | null) {
    return run({
      message: `${date}: Wordle`,
      journal: (j) => {
        const day = j.days[date] ?? { entries: [] }
        if (guesses) day.wordle = guesses
        else delete day.wordle
        if (!day.entries.length && !day.note && !day.wordle && !day.rings) delete j.days[date]
        else j.days[date] = day
        return j
      },
    }, 'Wordle saved.')
  }

  function step(delta: number) {
    if (!selected) return
    const { year, month, day } = parseKey(selected)
    const next = new Date(Date.UTC(year, month, day + delta))
    setSelected(dateKey(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()))
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() })
  }

  function saveNote(date: string, note: string) {
    run({
      message: `${date}: note`,
      journal: (j) => {
        const day = j.days[date] ?? { entries: [] }
        if (note) day.note = note
        else delete day.note
        if (!day.entries.length && !day.note && !day.wordle && !day.rings) delete j.days[date]
        else j.days[date] = day
        return j
      },
    }, 'Note saved.')
  }

  // Save rings from the Shortcut once editing is available in this browser.
  const savingRings = useRef(false)
  useEffect(() => {
    // Without editing the banner below asks for it; once it's on, this runs again and saves.
    if (!incomingRings || !token || savingRings.current) return
    savingRings.current = true
    const { date, rings } = incomingRings
    run({
      message: `${date}: activity rings`,
      journal: (j) => {
        const day = j.days[date] ?? { entries: [] }
        day.rings = rings
        j.days[date] = day
        return j
      },
    }, ringsClosed(rings) ? 'Rings saved. All closed! 🎉' : 'Rings saved.').finally(() => {
      savingRings.current = false
      setIncomingRings(null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRings, token])

  const go = (delta: number) => setView((v) => addMonths(v.year, v.month, delta))
  const t = parseKey(today)
  const onThisMonth = view.year === t.year && view.month === t.month

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1><span aria-hidden>🍃</span> Care Journal</h1>
          <p className="tagline">A little care, every day.</p>
        </div>
        {/* Editing is turned on at /post/; once on, this opens the sign-out. */}
        {editing && (
          <button className="edit-toggle is-on" onClick={() => setShowSetup(true)} title="Editing is on">
            <PenLine size={16} /> Editing
          </button>
        )}
      </header>

      <main>
        <div className="month-bar">
          <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous month"><ChevronLeft size={22} /></button>
          <h2 className="month-title">{monthTitle(view.year, view.month)}</h2>
          <button className="icon-btn" onClick={() => go(1)} aria-label="Next month"><ChevronRight size={22} /></button>
          <button className="btn btn-small" onClick={() => setView({ year: t.year, month: t.month })} disabled={onThisMonth}>Today</button>
        </div>

        {loadError && <p className="error banner">{loadError}</p>}
        {incomingRings && !token && (
          <div className="notice">
            <p>Your rings for {longDate(incomingRings.date)} are ready to save. Turn on editing in this browser to save them.</p>
            <div className="row-end">
              <button className="btn" onClick={() => setIncomingRings(null)}>Not now</button>
              <a className="btn btn-primary" href={`/post/${START_SEARCH}`}>Turn on editing</a>
            </div>
          </div>
        )}

        <div className={loaded ? '' : 'is-loading'}>
          <Calendar
            year={view.year}
            month={view.month}
            today={today}
            entriesFor={entriesFor}
            hasNote={hasNote}
            onPick={setSelected}
          />
        </div>

        <ul className="legend" aria-label="What the emojis mean">
          {ACTIVITIES.map((a) => <li key={a.id}><span aria-hidden>{a.emoji}</span> {a.label}</li>)}
        </ul>

        {editing && (
          <button className="btn btn-primary fab" onClick={() => { setSelected(today); setEditingEntry({ id: newId(), activity: '' }) }}>
            + Add to today
          </button>
        )}
      </main>

      {selected && !editingEntry && (
        <DayView
          key={selected}
          date={selected}
          note={journal.days[selected]?.note}
          entries={entriesFor(selected)}
          editing={editing}
          busy={busy}
          photoUrl={photoUrl}
          onClose={() => setSelected(null)}
          onAdd={() => setEditingEntry({ id: newId(), activity: '' })}
          onEdit={(e) => setEditingEntry(e)}
          onDelete={(e) => deleteEntry(selected, e)}
          onHideWordle={(e) => hideWordle(selected, e)}
          onSaveNote={(n) => saveNote(selected, n)}
          onSaveWordle={(g) => saveWordle(selected, g)}
          onStep={step}
          onOpenPhoto={(photos, index) => setLightbox({ photos, index })}
        />
      )}

      {selected && editingEntry && (
        <EntryForm
          key={editingEntry.id}
          date={selected}
          initial={editingEntry}
          busy={busy}
          photoUrl={photoUrl}
          error={saveError}
          onCancel={() => { setSaveError(''); setEditingEntry(null) }}
          onSave={(draft) => saveEntry(selected, draft)}
        />
      )}

      {lightbox && <Lightbox photos={lightbox.photos} start={lightbox.index} photoUrl={photoUrl} onClose={() => setLightbox(null)} />}

      {showSetup && (
        <EditorSetup
          signedIn={editing}
          onClose={() => setShowSetup(false)}
          onToken={(tok) => { storeToken(tok); setTokenState(tok); setShowSetup(false) }}
          onSignOut={() => { storeToken(null); setTokenState(null); setShowSetup(false) }}
        />
      )}

      {toast && <Toast text={toast} />}
    </div>
  )
}

/** Shown in the browser's top layer (a popover), so it appears above open dialogs too. */
function Toast({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    try { el?.showPopover() } catch { /* older browsers: it still shows, just under dialogs */ }
    return () => { try { el?.hidePopover() } catch { /* already hidden */ } }
  }, [])
  return <div ref={ref} popover="manual" className="toast" role="status">{text}</div>
}
