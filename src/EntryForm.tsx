import { ImagePlus, X } from 'lucide-react'
import { useState } from 'react'
import { ACTIVITIES } from './activities'
import { longDate } from './dates'
import { preparePhoto, type PreparedPhoto } from './images'
import { Modal } from './Modal'
import type { Entry, Photo } from './types'

export interface EntryDraft {
  entry: Entry
  newPhotos: PreparedPhoto[]
  removedPhotos: Photo[]
}

export function EntryForm({ date, initial, busy, error: saveError, photoUrl, onCancel, onSave }: {
  date: string
  initial: Entry
  busy: boolean
  error?: string
  photoUrl: (path: string) => string
  onCancel: () => void
  onSave: (draft: EntryDraft) => void
}) {
  const isNew = !initial.activity
  const [kind, setKind] = useState(initial.activity || '')
  const [title, setTitle] = useState(initial.title ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [link, setLink] = useState(initial.link ?? '')
  const [kept, setKept] = useState<Photo[]>(initial.photos ?? [])
  const [added, setAdded] = useState<PreparedPhoto[]>([])
  const [reading, setReading] = useState(0)
  const [error, setError] = useState('')

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setError('')
    const list = [...files]
    setReading((n) => n + list.length)
    for (const file of list) {
      try {
        const photo = await preparePhoto(file)
        setAdded((a) => [...a, photo])
      } catch {
        setError(`Could not read ${file.name}. Try a JPEG or PNG.`)
      } finally {
        setReading((n) => n - 1)
      }
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!kind) { setError('Pick what you did.'); return }
    let cleanLink = link.trim()
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) cleanLink = 'https://' + cleanLink
    const entry: Entry = {
      id: initial.id,
      activity: kind,
      ...(title.trim() && { title: title.trim() }),
      ...(note.trim() && { note: note.trim() }),
      ...(cleanLink && { link: cleanLink }),
    }
    const removed = (initial.photos ?? []).filter((p) => !kept.includes(p))
    if (kept.length) entry.photos = [...kept]
    onSave({ entry, newPhotos: added, removedPhotos: removed })
  }

  return (
    <Modal title={isNew ? `Add to ${longDate(date)}` : 'Edit entry'} onClose={onCancel}>
      <form className="form" onSubmit={submit}>
        <fieldset>
          <legend>What did you do?</legend>
          <div className="chips">
            {ACTIVITIES.map((a) => (
              <button
                type="button"
                key={a.id}
                className={`chip${kind === a.id ? ' is-on' : ''}`}
                aria-pressed={kind === a.id}
                onClick={() => setKind(a.id)}
              >
                <span aria-hidden>{a.emoji}</span> {a.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Title <em>(optional)</em></span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Learned Bridge Over Troubled Water" />
        </label>

        <label>
          <span>More detail <em>(optional)</em></span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>

        <label>
          <span>Link <em>(optional: AllTrails, a song, anything)</em></span>
          <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://…" />
        </label>

        <div>
          <span className="label">Photos</span>
          <div className="thumbs editable">
            {kept.map((p) => (
              <div key={p.src} className="thumb">
                <img src={photoUrl(p.thumb ?? p.src)} alt="" />
                <button type="button" className="thumb-x" aria-label="Remove photo" onClick={() => setKept((k) => k.filter((x) => x !== p))}><X size={14} /></button>
              </div>
            ))}
            {added.map((p) => (
              <div key={p.id} className="thumb">
                <img src={p.preview} alt="" />
                <button type="button" className="thumb-x" aria-label="Remove photo" onClick={() => setAdded((a) => a.filter((x) => x !== p))}><X size={14} /></button>
              </div>
            ))}
            {Array.from({ length: reading }, (_, i) => <div key={`r${i}`} className="thumb thumb-loading" />)}
            <label className="thumb thumb-add">
              <ImagePlus size={22} />
              <span>Add</span>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </label>
          </div>
        </div>

        {(error || saveError) && <p className="error" role="alert">{error || saveError}</p>}

        <div className="row-end">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy || reading > 0}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
