# Care Journal

Damian's journal calendar at https://care.damian-mus.uk. Family can look; only Damian can add to it.

Each day shows an emoji for what happened (🧩 puzzle, 🥾 walk, ⭕ rings closed, 🎸 music, 🍞 sourdough,
📷 photos, 🎮 video game, 🍷 alcohol, ✨ something else). Tap a day to see notes, links (AllTrails,
songs) and photos.

## How it works

There's no server or database. Everything is files in this repo:

| Path | What |
| --- | --- |
| `public/data/journal.json` | Every entry typed in on the site, by date |
| `public/photos/YYYY/MM/` | Uploaded photos (resized to 1800px) and their thumbnails |
| `public/data/wordle.json`, `public/wordle/` | Wordle screenshots copied from the shared iCloud album |
| `src/activities.ts` | The list of activities and their emojis. Add a line to add a new kind. |
| `scripts/import-wordle.mjs` | Copies new screenshots from the iCloud album |
| `.github/workflows/wordle.yml` | Runs the Wordle import every 3 hours |

**Editing:** tap the 🔒 button and paste a fine-grained GitHub token for this repo only, with
*Contents: Read and write*. The token stays in that browser. Saving makes one commit, and
Cloudflare rebuilds the site, so everyone sees the change about a minute later.

**Wordle:** the workflow reads the public shared album, saves new screenshots, and files each one
on the day it was taken (Perth time). Run it now from Actions › Import Wordle screenshots › Run
workflow. To hide one, open the day while editing and tap the eye button.

## Run it

```bash
npm install
npm run dev
npm run build
npm run lint
npm run import-wordle   # fetch Wordle screenshots locally
```

## Deploying

Cloudflare builds and deploys the `care` Worker when `main` is pushed. `wrangler.jsonc` serves
`dist/` as a single-page app.
