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
| `public/data/wordle.json`, `public/wordle/` | Wordle screenshots copied from the shared iCloud album, with the guesses read off each one |
| `public/data/wordle-answers.json` | Every Wordle answer, from WordFinder |
| `src/activities.ts` | The list of activities and their emojis. Add a line to add a new kind. |
| `scripts/import-wordle.mjs` | Copies new screenshots from the iCloud album |
| `scripts/wordle-answers.mjs` | Updates the answers from https://wordfinder.yourdictionary.com/wordle/answers/ |
| `scripts/read-wordle.py`, `scripts/wordle-letters.npz` | Reads letters and colours off screenshots (matching learned letter shapes) and keeps only reads whose colours check out |
| `.github/workflows/wordle.yml` | Runs the Wordle import every 3 hours |

**Editing:** go to https://care.damian-mus.uk/post/ and paste a fine-grained GitHub token for this repo only, with
*Contents: Read and write*. Once it checks out, /post/ says editing is on and waits for **OK** before going to the
journal, so there's time to add it to the home screen (Share › Add to Home Screen; it's saved as
"Care Post" and opens at /post/, using `public/manifest-post.webmanifest`). On the journal an *Editing*
button shows at the top (tap it to turn editing off). The front page has no sign-in. The token stays in that browser. Saving makes one commit, and
Cloudflare rebuilds the site, so everyone sees the change about a minute later.

**Wordle:** the workflow reads the public shared album, saves new screenshots, and files each one
on the day it was taken (Perth time). Run it now from Actions › Import Wordle screenshots › Run
workflow. Each Wordle shows as a coloured grid with the answer. While editing, tap the pencil on a
Wordle to type the guesses yourself (one word per line), or 🧩 Add Wordle on a day without one.
Typed guesses win over the screenshot. To hide a screenshot, tap the eye button.

**Activity rings:** the "Care rings" iPhone Shortcut reads today's Move, Exercise and Stand from
Apple Health and opens `/?rings=YYYY-MM-DD&move=…&moveGoal=…&unit=kJ&exercise=…&exerciseGoal=…&stand=…&standGoal=…`.
With editing on in that browser, the journal saves them to the day (`rings` in journal.json). ⭕ shows
on the calendar when all three are closed.

**Steps:** the "Care Rings" Shortcut also writes daily step counts through the GitHub API, one file
per month: `public/data/steps-2026-01.json`, `public/data/steps-2026-02.json` and so on
(`[{"date":"YYYY-MM-DD","steps":1234}, …]`, steps as a number or a string; the date can also be the
Shortcuts default, e.g. `"27 Nov 2026 at 12:36 am"`). The
site loads the file for the month on screen. 👟 shows on days at or over `STEP_GOAL` in `src/config.ts` (10,000).

**Rings:** the same Shortcut sends `move-2026-11.json` (kJ), `exercise-2026-11.json` (minutes) and
`stand-2026-11.json` (stand minutes), each `[{"date":…,"move":…}, …]`. Days with any of them show the
Activity rings against the goals in `src/healthData.ts` (Move 2120 kJ, Exercise 30 min, Stand 12 hr).
Stand grouped by hour counts each hour with at least a minute of standing; a stand file grouped by day
counts every day in it as 12 hours. Rings saved from a Shortcut link (`?rings=…`) take priority.

**Daily file:** from 27 Nov 2026 the Shortcut also sends `activity-2026-11-27.json`: hourly rows for
Steps, Stand Time (minutes), Active Calories (kJ) and Exercise Time, e.g.
`{"date" : "27 Nov 2026 at 9:00 am", "Steps" : "770"}`. Its totals win over the monthly files for that day.
Days before `DAILY_FILES_FROM` in `src/healthData.ts` aren't looked for.

In a day's view, swipe left or right (or use the ‹ › buttons or arrow keys) to move between days.

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
