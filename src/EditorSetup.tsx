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
    <Modal title="Sign in" onClose={onClose}>
      {/* A plain username + password form, so the phone's password manager can save the key once and fill it in on every damian-mus.uk app. */}
      <form className="form" onSubmit={submit} autoComplete="on">
        <input type="text" name="username" autoComplete="username" value="damian" readOnly hidden aria-hidden />
        <label>
          <span>Please enter password</span>
          <input
            type="password"
            name="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row-end">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={checking || !token.trim()}>
            {checking ? 'Checking…' : 'Sign in'}
          </button>
        </div>
        <details className="muted">
          <summary>No password?</summary>
          <p>
            The password is a GitHub fine-grained token with <strong>Contents: Read and write</strong> on <strong>{REPO_OWNER}/{REPO_NAME}</strong>.
            Make one at <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer">GitHub › New fine-grained token</a>. It stays on this device only.
          </p>
        </details>
      </form>
    </Modal>
  )
}
