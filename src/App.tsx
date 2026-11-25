import { ChevronLeft, ChevronRight, Lock, PenLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ACTIVITIES } from './activities'
import { Calendar } from './Calendar'
import { BRANCH, REPO_NAME, REPO_OWNER } from './config'
import { addMonths, monthTitle, parseKey, todayKey } from './dates'
import { DayView } from './DayView'
import { EditorSetup } from './EditorSetup'
import { EntryForm, type EntryDraft } from './EntryForm'
import { getToken, loadLatest, save, setToken as storeToken, type Change } from './github'
import { newId } from './images'
import { Lightbox } from './Lightbox'
import type { Entry, Journal, Photo, WordleData } from './types'

const EMPTY_JOURNAL: Journal = { version: 1, days: {} }
const EMPTY_WORDLE: WordleData = { photos: {}, hidden: [] }

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
  const [journal, setJournal] = useState<Journal>(EMPTY_JOURNAL)
  const [wordle, setWordle] = useState<WordleData>(EMPTY_WORDLE)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [token, setTokenState] = useState<string | null>(getToken)
  const [view, setView] = useState({ year: initial.year, month: initial.month })
  const [selected, setSelected] = useState<string | null>(initial.day)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
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

  // Keep the address in step so a link to a month or a day can be shared.
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('m', `${view.year}-${String(view.month + 1).padStart(2, '0')}`)
    if (selected) p.set('d', selected)
    history.replaceState(null, '', `${location.pathname}?${p}`)
  }, [view, selected])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Photos saved in the last minute aren't on the live site yet, so the editor reads them from GitHub.
  const photoUrl = useCallback((path: string) =>
    editing ? `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/public/${path}` : `/${path}`, [editing])

  const wordleByDate = useMemo(() => {
    const hidden = new Set(wordle.hidden ?? [])
    const map = new Map<string, Entry[]>()
    for (const [guid, w] of Object.entries(wordle.photos)) {
      if (hidden.has(guid)) continue
      const entry: Entry = { id: `wordle:${guid}`, activity: 'puzzle', title: 'Wordle', photos: [{ src: w.file }], auto: true, ...(w.caption && { note: w.caption }) }
      map.set(w.date, [...(map.get(w.date) ?? []), entry])
    }
    return map
  }, [wordle])

  const entriesFor = useCallback((key: string) => [
    ...(wordleByDate.get(key) ?? []),
    ...(journal.days[key]?.entries ?? []),
  ], [journal, wordleByDate])

  const hasNote = useCallback((key: string) => !!journal.days[key]?.note, [journal])

  async function run(change: Change, done: string) {
    if (!token) return false
    setBusy(true)
    try {
      const result = await save(token, change)
      setJournal(result.journal)
      setWordle(result.wordle)
      setToast(`${done} Everyone will see it in about a minute.`)
      return true
    } catch (e) {
      setToast(`Couldn't save: ${(e as Error).message}`)
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
        if (!day.entries.length && !day.note) delete j.days[date]
        return j
      },
    }, 'Deleted.')
  }

  function hideWordle(date: string, entry: Entry) {
    const guid = entry.id.replace(/^wordle:/, '')
    if (!confirm('Hide this Wordle from the journal?')) return
    run({
      message: `${date}: hide a Wordle`,
      wordle: (w) => ({ ...w, hidden: [...new Set([...(w.hidden ?? []), guid])] }),
    }, 'Hidden.')
  }

  function saveNote(date: string, note: string) {
    run({
      message: `${date}: note`,
      journal: (j) => {
        const day = j.days[date] ?? { entries: [] }
        if (note) day.note = note
        else delete day.note
        if (!day.entries.length && !day.note) delete j.days[date]
        else j.days[date] = day
        return j
      },
    }, 'Note saved.')
  }

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
        <button
          className={`edit-toggle${editing ? ' is-on' : ''}`}
          onClick={() => setShowSetup(true)}
          aria-label={editing ? 'Editing is on' : 'Edit'}
          title={editing ? 'Editing is on' : 'Edit'}
        >
          {editing ? <><PenLine size={16} /> Editing</> : <Lock size={16} />}
        </button>
      </header>

      <main>
        <div className="month-bar">
          <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous month"><ChevronLeft size={22} /></button>
          <h2 className="month-title">{monthTitle(view.year, view.month)}</h2>
          <button className="icon-btn" onClick={() => go(1)} aria-label="Next month"><ChevronRight size={22} /></button>
          <button className="btn btn-small" onClick={() => setView({ year: t.year, month: t.month })} disabled={onThisMonth}>Today</button>
        </div>

        {loadError && <p className="error banner">{loadError}</p>}

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
          onCancel={() => setEditingEntry(null)}
          onSave={(draft) => saveEntry(selected, draft)}
        />
      )}

      {lightbox && <Lightbox photos={lightbox.photos} start={lightbox.index} photoUrl={photoUrl} onClose={() => setLightbox(null)} />}

      {showSetup && (
        <EditorSetup
          signedIn={editing}
          onClose={() => setShowSetup(false)}
          onToken={(tok) => { storeToken(tok); setTokenState(tok); setShowSetup(false); setToast('Editing is on. Tap a day to add to it.') }}
          onSignOut={() => { storeToken(null); setTokenState(null); setShowSetup(false) }}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
