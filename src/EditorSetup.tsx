import { useState } from 'react'
import { REPO_NAME, REPO_OWNER } from './config'
import { checkToken } from './github'
import { Modal } from './Modal'

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

export function EditorSetup({ signedIn, onClose, onToken, onSignOut }: {
  signedIn: boolean
  onClose: () => void
  onToken: (token: string) => void
  onSignOut: () => void
}) {
  const [token, setToken] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = token.trim()
    if (!t) return
    setChecking(true)
    setError('')
    const problem = await checkToken(t)
    setChecking(false)
    if (problem) setError(problem)
    else onToken(t)
  }

  if (signedIn) {
    return (
      <Modal title="Editing is on" onClose={onClose}>
        <div className="form">
          <p>This device can add and change journal entries. Everyone else only sees the calendar.</p>
          <p className="muted">Saved changes show up for everyone about a minute later, once the site rebuilds.</p>
          <div className="row-end">
            <button className="btn" onClick={onSignOut}>Turn off editing here</button>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Edit the journal" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p>Editing uses a private GitHub key that only works on the <strong>{REPO_OWNER}/{REPO_NAME}</strong> repo. It's kept on this device only.</p>
        <ol className="steps">
          <li>Open <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer">GitHub › New fine-grained token</a>.</li>
          <li>Name it “Care journal” and pick an expiry. A year is fine.</li>
          <li>Under <em>Repository access</em>, choose <em>Only select repositories</em> › <strong>{REPO_NAME}</strong>.</li>
          <li>Under <em>Permissions</em>, set <strong>Contents</strong> to <em>Read and write</em>.</li>
          <li>Generate it, copy it, and paste it below.</li>
        </ol>
        <label>
          <span>GitHub key</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row-end">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={checking || !token.trim()}>
            {checking ? 'Checking…' : 'Turn on editing'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
