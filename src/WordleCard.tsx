import { ExternalLink, EyeOff, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { Photo, WordleDay } from './types'
import { ARCHIVE_URL, parseGuesses, score, wordleNumber } from './wordle'

export function WordleCard({ info, editing, busy, startEditing, photoUrl, onSave, onHideScreenshot, onOpenPhoto }: {
  info: WordleDay
  editing: boolean
  busy: boolean
  /** Open straight into typing guesses (for a day with no Wordle yet). */
  startEditing?: boolean
  photoUrl: (path: string) => string
  /** null clears typed guesses (back to the screenshot's). */
  onSave: (guesses: string[] | null) => Promise<boolean>
  onHideScreenshot: () => void
  onOpenPhoto: (photos: Photo[], index: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(startEditing ? info.guesses.join('\n') : null)
  const [problem, setProblem] = useState('')
  const { guesses, answer } = info
  const solved = !!answer && guesses[guesses.length - 1] === answer
  const result = !guesses.length ? '' : !answer ? '' : solved ? `${guesses.length}/6` : guesses.length >= 6 ? 'X/6' : ''

  async function save() {
    const parsed = parseGuesses(draft ?? '')
    if (parsed.problem) { setProblem(parsed.problem); return }
    setProblem('')
    if (await onSave(parsed.guesses.length ? parsed.guesses : null)) setDraft(null)
  }

  // While typing, show the grid as it will look.
  const shown = draft !== null ? parseGuesses(draft).guesses.filter((g) => g.length === 5).slice(0, 6) : guesses

  return (
    <li className="entry wordle">
      <div className="entry-emoji" aria-hidden>🧩</div>
      <div className="entry-body">
        <div className="entry-top">
          <div>
            <div className="entry-kind">Puzzle</div>
            <h3 className="entry-title">Wordle #{wordleNumber(info.date)}{result && <span className="wordle-result"> · {result}</span>}</h3>
          </div>
          {editing && draft === null && (
            <div className="entry-actions">
              <button className="icon-btn" title="Type the guesses" aria-label="Type the guesses" onClick={() => setDraft(guesses.join('\n'))} disabled={busy}><Pencil size={17} /></button>
              {info.guid && <button className="icon-btn" title="Hide the screenshot" aria-label="Hide the screenshot" onClick={onHideScreenshot} disabled={busy}><EyeOff size={17} /></button>}
            </div>
          )}
        </div>

        <div className="wordle-layout">
          {shown.length > 0 && (
            <div className="wordle-grid" role="img" aria-label={`Guesses: ${shown.join(', ')}`}>
              {shown.map((g, r) => {
                const marks = answer ? score(g, answer) : null
                return (
                  <div className="wordle-row" key={r}>
                    {[...g].map((ch, i) => <span key={i} className={`tile${marks ? ' tile-' + marks[i] : ''}`}>{ch}</span>)}
                  </div>
                )
              })}
              {answer && !solved && shown.length < 6 && draft === null && Array.from({ length: 6 - shown.length }, (_, r) => (
                <div className="wordle-row" key={`e${r}`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className="tile tile-empty" />)}</div>
              ))}
            </div>
          )}

          <div className="wordle-side">
            {answer && guesses.length > 0 && <div className="wordle-answer">{answer}</div>}
            {guesses.length > 0 && (
              <div className="muted wordle-status">
                {!answer ? 'Answer not out yet.' : solved ? (guesses.length === 1 ? 'First go!' : `Got it in ${guesses.length}.`) : 'Not this time.'}
              </div>
            )}
            {info.screenshot && (
              <button className="wordle-shot" onClick={() => onOpenPhoto([info.screenshot!], 0)} aria-label="See the screenshot">
                <img src={photoUrl(info.screenshot.thumb ?? info.screenshot.src)} alt="" loading="lazy" />
              </button>
            )}
            <a className="text-btn" href={ARCHIVE_URL} target="_blank" rel="noreferrer">WordFinder archive <ExternalLink size={13} /></a>
          </div>
        </div>

        {draft !== null && (
          <div className="wordle-edit">
            <label>
              <span>Guesses, one per line</span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                rows={6}
                autoFocus
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder={'STREW\nBRICK\nMAYOR\nMAJOR'}
              />
            </label>
            {problem && <p className="error">{problem}</p>}
            {!info.answer && <p className="muted">The answer gets checked against WordFinder once it's published.</p>}
            <div className="row-end">
              {info.typed && <button className="btn" onClick={() => onSave(null).then((ok) => ok && setDraft(null))} disabled={busy}>{info.screenshot ? 'Use screenshot' : 'Remove'}</button>}
              <button className="btn" onClick={() => { setDraft(null); setProblem('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
