/**
 * Saving to the journal. The site has no server: the editor writes straight into the GitHub repo
 * with a fine-grained personal access token that lives only in this browser (localStorage).
 * Cloudflare rebuilds the site on every commit, so changes reach everyone about a minute later.
 */
import { BRANCH, JOURNAL_PATH, REPO_NAME, REPO_OWNER, WORDLE_PATH } from './config'
import type { Journal, WordleData } from './types'

const TOKEN_KEY = 'care.githubToken'
const API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* private browsing: editing just won't be remembered */ }
}

export class GitHubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith('http') ? path : API + path, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    let message = res.statusText
    try { message = (await res.json()).message ?? message } catch { /* not JSON */ }
    throw new GitHubError(res.status, message)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

/** Checks the token can write to the repo. Returns an error message, or null when it is fine. */
export async function checkToken(token: string): Promise<string | null> {
  try {
    const repo = await gh<{ permissions?: { push?: boolean } }>(token, '')
    if (!repo.permissions?.push) return 'That key can read the repo but not save to it. Give it "Contents: Read and write".'
    return null
  } catch (e) {
    if (e instanceof GitHubError && e.status === 401) return 'GitHub did not accept that key. Check it was copied in full.'
    if (e instanceof GitHubError && e.status === 404) return `That key cannot see ${REPO_OWNER}/${REPO_NAME}. Pick that repo when making the key.`
    return `Could not reach GitHub: ${(e as Error).message}`
  }
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function readJson<T>(token: string, path: string, ref: string, fallback: T): Promise<T> {
  try {
    const file = await gh<{ content: string }>(token, `/contents/${path}?ref=${ref}`)
    return JSON.parse(base64ToUtf8(file.content)) as T
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return fallback
    throw e
  }
}

const EMPTY_JOURNAL: Journal = { version: 1, days: {} }
const EMPTY_WORDLE: WordleData = { photos: {}, hidden: [] }

/** The newest saved journal, straight from GitHub (the live site can be a minute behind). */
export async function loadLatest(token: string): Promise<{ journal: Journal; wordle: WordleData }> {
  const [journal, wordle] = await Promise.all([
    readJson(token, JOURNAL_PATH, BRANCH, EMPTY_JOURNAL),
    readJson(token, WORDLE_PATH, BRANCH, EMPTY_WORDLE),
  ])
  return { journal, wordle }
}

export interface NewFile {
  /** Repo path, e.g. "public/photos/2026/11/abc.jpg". */
  path: string
  base64: string
}

export interface Change {
  message: string
  /** Applied to the newest journal.json; return the new journal. */
  journal?: (journal: Journal) => Journal
  wordle?: (wordle: WordleData) => WordleData
  addFiles?: NewFile[]
  deleteFiles?: string[]
}

/**
 * Makes one commit with all the changes. If something else saved in the meantime (the Wordle job,
 * or another device) it re-reads the newest files and tries again, so nothing is overwritten.
 */
export async function save(token: string, change: Change): Promise<{ journal: Journal; wordle: WordleData }> {
  // Upload pictures once, before the retry loop.
  const blobs = await Promise.all((change.addFiles ?? []).map(async (file) => {
    const blob = await gh<{ sha: string }>(token, '/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: file.base64, encoding: 'base64' }),
    })
    return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha }
  }))

  for (let attempt = 0; ; attempt++) {
    const ref = await gh<{ object: { sha: string } }>(token, `/git/ref/heads/${BRANCH}`)
    const head = ref.object.sha
    const commit = await gh<{ tree: { sha: string } }>(token, `/git/commits/${head}`)

    let journal = await readJson(token, JOURNAL_PATH, head, EMPTY_JOURNAL)
    let wordle = await readJson(token, WORDLE_PATH, head, EMPTY_WORDLE)
    const tree: object[] = [...blobs]
    if (change.journal) {
      journal = change.journal(structuredClone(journal))
      tree.push({ path: JOURNAL_PATH, mode: '100644', type: 'blob', content: JSON.stringify(journal, null, 2) + '\n' })
    }
    if (change.wordle) {
      wordle = change.wordle(structuredClone(wordle))
      tree.push({ path: WORDLE_PATH, mode: '100644', type: 'blob', content: JSON.stringify(wordle, null, 2) + '\n' })
    }
    for (const path of change.deleteFiles ?? []) tree.push({ path, mode: '100644', type: 'blob', sha: null })

    const newTree = await gh<{ sha: string }>(token, '/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
    })
    const newCommit = await gh<{ sha: string }>(token, '/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: change.message, tree: newTree.sha, parents: [head] }),
    })
    try {
      await gh(token, `/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommit.sha, force: false }),
      })
      return { journal, wordle }
    } catch (e) {
      // 422: someone else saved first. Start again from their version.
      if (e instanceof GitHubError && e.status === 422 && attempt < 3) continue
      throw e
    }
  }
}

export { utf8ToBase64 }
