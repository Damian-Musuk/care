import { ChevronLeft, ChevronRight, EyeOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { activity } from './activities'
import { longDate } from './dates'
import { Modal } from './Modal'
import type { Entry, Photo } from './types'
import { WordleCard } from './WordleCard'
import { RingsCard } from './Rings'

function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.endsWith('alltrails.com')) return 'See the walk on AllTrails'
    if (host === 'songs.damian-mus.uk') return 'Listen to the song'
    if (host.endsWith('icloud.com')) return 'Open in iCloud'
    return `Open ${host}`
  } catch {
    return 'Open link'
  }
}

export function DayView({ date, note, entries, editing, busy, photoUrl, onClose, onAdd, onEdit, onDelete, onHideWordle, onSaveNote, onSaveWordle, onOpenPhoto, onStep }: {
  date: string
  note?: string
  entries: Entry[]
  editing: boolean
  busy: boolean
  photoUrl: (path: string) => string
  onClose: () => void
  onAdd: () => void
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
  onHideWordle: (entry: Entry) => void
  onSaveNote: (note: string) => void
  onSaveWordle: (guesses: string[] | null) => Promise<boolean>
  onOpenPhoto: (photos: Photo[], index: number) => void
  /** Move to the day before (-1) or after (+1). */
  onStep: (delta: number) => void
}) {
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [addingWordle, setAddingWordle] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const hasWordle = entries.some((e) => e.wordle)

  // Left and right arrow keys move between days, unless you're typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea') || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowLeft') onStep(-1)
      if (e.key === 'ArrowRight') onStep(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStep])

  const title = (
    <span className="day-title">
      <button className="icon-btn" onClick={() => onStep(-1)} aria-label="Previous day" title="Previous day"><ChevronLeft size={22} /></button>
      <span>{longDate(date)}</span>
      <button className="icon-btn" onClick={() => onStep(1)} aria-label="Next day" title="Next day"><ChevronRight size={22} /></button>
    </span>
  )

  return (
    <Modal title={title} onClose={onClose} className="day-modal">
      <div
        className="day-swipe"
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={(e) => {
          const start = touch.current
          touch.current = null
          if (!start || noteDraft !== null) return
          const dx = e.changedTouches[0].clientX - start.x
          const dy = e.changedTouches[0].clientY - start.y
          // A clear sideways swipe, not a scroll or a tap.
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) onStep(dx < 0 ? 1 : -1)
        }}
      >
      {noteDraft === null ? (
        (note || editing) && (
          <div className="day-note">
            {note ? <p>{note}</p> : <p className="muted">No note for this day.</p>}
            {editing && (
              <button className="text-btn" onClick={() => setNoteDraft(note ?? '')} disabled={busy}>
                <Pencil size={14} /> {note ? 'Edit note' : 'Write a note'}
              </button>
            )}
          </div>
        )
      ) : (
        <div className="day-note">
          <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4} placeholder="How was today?" autoFocus />
          <div className="row-end">
            <button className="btn" onClick={() => setNoteDraft(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => { onSaveNote(noteDraft.trim()); setNoteDraft(null) }}>Save note</button>
          </div>
        </div>
      )}

      {entries.length === 0 && !note && !addingWordle && <p className="muted empty">Nothing recorded for this day.</p>}

      <ul className="entries">
        {addingWordle && !hasWordle && (
          <WordleCard
            info={{ date, guesses: [], typed: true }}
            editing
            busy={busy}
            startEditing
            photoUrl={photoUrl}
            onSave={async (g) => { const ok = g ? await onSaveWordle(g) : true; if (ok) setAddingWordle(false); return ok }}
            onHideScreenshot={() => {}}
            onOpenPhoto={onOpenPhoto}
          />
        )}
        {entries.map((entry) => {
          if (entry.rings) return <RingsCard key={entry.id} rings={entry.rings} />
          if (entry.wordle) {
            return (
              <WordleCard
                key={entry.id}
                info={entry.wordle}
                editing={editing}
                busy={busy}
                photoUrl={photoUrl}
                onSave={onSaveWordle}
                onHideScreenshot={() => onHideWordle(entry)}
                onOpenPhoto={onOpenPhoto}
              />
            )
          }
          const a = activity(entry.activity)
          return (
            <li key={entry.id} className="entry">
              <div className="entry-emoji" aria-hidden>{a.emoji}</div>
              <div className="entry-body">
                <div className="entry-top">
                  <div>
                    <div className="entry-kind">{a.label}</div>
                    {entry.title && <h3 className="entry-title">{entry.title}</h3>}
                  </div>
                  {editing && entry.activity !== 'steps' && (
                    <div className="entry-actions">
                      {entry.auto ? (
                        <button className="icon-btn" title="Hide this Wordle" aria-label="Hide this Wordle" onClick={() => onHideWordle(entry)} disabled={busy}><EyeOff size={17} /></button>
                      ) : (
                        <>
                          <button className="icon-btn" title="Edit" aria-label="Edit" onClick={() => onEdit(entry)} disabled={busy}><Pencil size={17} /></button>
                          <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => onDelete(entry)} disabled={busy}><Trash2 size={17} /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {entry.note && <p className="entry-note">{entry.note}</p>}
                {entry.link && (
                  <a className="entry-link" href={entry.link} target="_blank" rel="noreferrer">
                    {linkLabel(entry.link)} <ExternalLink size={14} />
                  </a>
                )}
                {!!entry.photos?.length && (
                  <div className={`thumbs${entry.auto ? ' thumbs-tall' : ''}`}>
                    {entry.photos.map((p, i) => (
                      <button key={p.src} className="thumb" onClick={() => onOpenPhoto(entry.photos!, i)} aria-label={`Photo ${i + 1}`}>
                        <img src={photoUrl(p.thumb ?? p.src)} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {editing && (
        <div className="day-add">
          <button className="btn btn-primary" onClick={onAdd} disabled={busy}>
            <Plus size={18} /> Add to this day
          </button>
          {!hasWordle && !addingWordle && (
            <button className="btn" onClick={() => setAddingWordle(true)} disabled={busy}>🧩 Add Wordle</button>
          )}
        </div>
      )}
      </div>
    </Modal>
  )
}
