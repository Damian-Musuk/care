import { useEffect } from 'react'
import { EditorSetup } from './EditorSetup'
import { getToken, setToken } from './github'

/** Where to go afterwards: the journal, keeping anything the address carried (e.g. rings from the Shortcut). */
function mainPage() {
  return `/${location.search}`
}

/**
 * /post/: the only place to turn on editing. Once the key checks out, it goes back to the journal.
 * A browser that already has editing on goes straight back.
 */
export function PostPage() {
  const signedIn = !!getToken()
  useEffect(() => {
    if (signedIn) location.replace(mainPage())
  }, [signedIn])

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1><span aria-hidden>🍃</span> Care Journal</h1>
          <p className="tagline">A little care, every day.</p>
        </div>
      </header>
      {!signedIn && (
        <EditorSetup
          signedIn={false}
          onClose={() => location.replace('/')}
          onToken={(tok) => { setToken(tok); location.replace(mainPage()) }}
          onSignOut={() => {}}
        />
      )}
    </div>
  )
}
