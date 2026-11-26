import { useEffect, useState } from 'react'
import { EditorSetup } from './EditorSetup'
import { getToken, setToken } from './github'

/** Where to go afterwards: the journal, keeping anything the address carried (e.g. rings from the Shortcut). */
function mainPage() {
  return `/${location.search}`
}

/** True when opened from a home screen icon rather than in the browser. */
const standalone =
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/**
 * /post/: the only place to sign in. It has its own page and manifest (post/index.html), so a home screen icon
 * saved from here opens here. In the browser it waits for OK once signed in, so there's time to add it to the home screen.
 */
export function PostPage() {
  const [signedIn, setSignedIn] = useState(() => !!getToken())

  // From the home screen icon there's nothing to wait for: once signed in, go straight to the journal.
  useEffect(() => {
    if (signedIn && standalone) location.replace(mainPage())
  }, [signedIn])

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1><span aria-hidden>🍃</span> Care Journal</h1>
          <p className="tagline">A little care, every day.</p>
        </div>
      </header>
      {signedIn ? (
        <main className="notice">
          <h2>Editing is on</h2>
          <p>This device can add to the journal.</p>
          <p className="muted">
            To open this page from your phone's home screen, tap Share and then <strong>Add to Home Screen</strong> before you tap OK.
          </p>
          <div className="row-end">
            <a className="btn btn-primary" href={mainPage()}>OK</a>
          </div>
        </main>
      ) : (
        <EditorSetup
          signedIn={false}
          onClose={() => location.replace('/')}
          onToken={(tok) => { setToken(tok); setSignedIn(true) }}
          onSignOut={() => {}}
        />
      )}
    </div>
  )
}
