import { EyeOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { activity } from './activities'
import { longDate } from './dates'
import { Modal } from './Modal'
import type { Entry, Photo } from './types'

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

export function DayView({ date, note, entries, editing, busy, photoUrl, onClose, onAdd, onEdit, onDelete, onHideWordle, onSaveNote, onOpenPhoto }: {
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
  onOpenPhoto: (photos: Photo[], index: number) => void
}) {
  const [noteDraft, setNoteDraft] = useState<string | null>(null)

  return (
    <Modal title={longDate(date)} onClose={onClose} className="day-modal">
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

      {entries.length === 0 && !note && <p className="muted empty">Nothing recorded for this day.</p>}

      <ul className="entries">
        {entries.map((entry) => {
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
                  {editing && (
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
        <button className="btn btn-primary btn-block" onClick={onAdd} disabled={busy}>
          <Plus size={18} /> Add to this day
        </button>
      )}
    </Modal>
  )
}
