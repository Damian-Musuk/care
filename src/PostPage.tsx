import { useEffect, useState } from 'react'
import { EditorSetup } from './EditorSetup'
import { getToken, setToken } from './github'

/** Where to go afterwards: the journal, keeping anything the address carried (e.g. rings from the Shortcut). */
function mainPage() {
  return `/${location.search}`
}

/** Saved to a phone's home screen from here, the app opens at /post/ and is called "Care Post". */
function useHomeScreenAppForPost() {
  useEffect(() => {
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', '/manifest-post.webmanifest')
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', 'Care Post')
  }, [])
}

/**
 * /post/: the only place to turn on editing. Once editing is on it waits for OK before going to the journal,
 * so there's time to add the page to the home screen.
 */
export function PostPage() {
  useHomeScreenAppForPost()
  const [signedIn, setSignedIn] = useState(() => !!getToken())

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
