# CRACK THE BOX

**Pick it. Open it. Solve it.** — a live, big-screen audience puzzle game.

Numbered mystery boxes each hide one visual puzzle. The audience picks a
box, it flies to the centre, shakes, counts down and bursts open to reveal a
puzzle category. The room shouts out answers; the facilitator reveals the
answer with an animation, marks it **Correct** or **Not Quite**, and an
approved animated mascot reacts. Nothing auto-advances — the facilitator drives
every step.

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS v4 ·
Framer Motion · localStorage. Runs fully offline once the media assets are in
place.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to ./out
```

Other scripts:

```bash
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run check:puzzles  # validate the bundled seed in data/puzzles.ts
npm run media:manifest # re-scan public/media/puzzles into data/media-manifest.json
npm run sfx            # regenerate sound effects  → public/media/sfx
npm run music          # regenerate background loop → public/media/audio
```

## Puzzle types

Nine types: **Scramble**, **Rebus**,
**Picture + Word**, **Picture Combination**, **Emoji Decode**, **Missing
Letters**, **Zoom In**, **Odd One Out**, and **What Connects Them?**

Images are referenced only through each puzzle's `imageAssets` array (never
hard-coded in a component) and live in
[`public/media/puzzles/`](public/media/puzzles).

## Questions

**Edit questions in the app, at [`/admin/questions`](#managing-questions) — not
in a source file.**

[`data/puzzles.ts`](data/puzzles.ts) is the bundled **seed**: the 50 questions a
fresh browser starts with, and the set that **Restore defaults** returns to. Keep
it valid (`npm run check:puzzles`) but treat it as the factory default rather than
the live content.

### Where questions are stored

`localStorage`, key **`crackthebox.puzzles.v1`**, in the browser running the
game. The app is a static export with no server, so this is the only durable
store available.

Two consequences worth knowing before an event:

- **Questions do not travel between machines or browser profiles.** A bank edited
  on a laptop is not on the projector PC. Use **Export CSV** or **Export JSON
  backup** and import on the other machine.
- **Clearing site data deletes them.** Keep a JSON backup.

With no saved bank, the bundled seed plays — which is why a fresh browser behaves
exactly as it always did.

Box numbers are **derived**, never stored: the wall takes the active questions in
admin order and numbers them 1..N. Deleting or disabling a question renumbers the
wall rather than leaving a dead box behind.

### Managing questions

Open the gear panel in the game and choose **Manage questions**, or go straight
to `/admin/questions`. The route is gated by the facilitator PIN
(`adminPin`, default **`1234`**, changeable in the game's settings).

> The PIN is **obfuscation, not security** — it lives in `localStorage` and is
> readable in devtools. It exists to stop an audience member editing the bank on a
> shared laptop. **Replace it with real server-side authentication before putting
> this build on a public URL.**

The admin supports: view, search, filter (type / category / difficulty / active /
has-problems), sort, add, edit, duplicate, delete, enable/disable, reorder (drag,
↑↓ buttons, arrow keys on the grip, or a position box), preview at projector
scale, CSV import/export, JSON backup/restore, and restore-defaults.

Views are addressed by query string:

| URL | View |
| --- | --- |
| `/admin/questions` | the list |
| `/admin/questions?v=new` (or `/admin/questions/new`) | add a question |
| `/admin/questions?v=edit&uid=<uid>` | edit one |
| `/admin/questions?v=import` | import / export |

There is deliberately **no `/admin/questions/[id]/edit`**. Under
`output: "export"` a dynamic segment needs every id at build time, and question
ids exist only in the visitor's `localStorage` — so the route cannot be
generated. `?v=edit&uid=…` is the equivalent.

Editing controls exist **only** on this route. The in-game facilitator panel
links out to it and never renders a form, so nothing editable can appear on a
projector.

### Validation

Every add, edit and imported CSV row goes through
[`lib/puzzleValidation.ts`](lib/puzzleValidation.ts) — one rulebook, so a rule
cannot be enforced in the form and forgotten on import. Invalid questions cannot
be saved, and a question that would crash the projected game (no answer, a zoom
with no image) cannot be made active at all.

It reproduces every rule in
[`scripts/validate-puzzles.mjs`](scripts/validate-puzzles.mjs) except three that
are true of the seed only — exactly 50 questions, every box 1..50 filled, all nine
types present — which would otherwise make a twelve-question bank unsavable.

### CSV and JSON

**Export CSV** for spreadsheet work; **Export JSON backup** to copy a bank
between machines losslessly. **Download CSV template** gives the header plus
three worked examples.

CSV has 22 columns matched **by name**, so reordering columns in a spreadsheet is
safe. The nested payloads — `imageAssets`, `rows`, `choices`, `clues` — hold
**JSON inside a single column**, because a rebus row can contain any number of
clues and flattening it would either cap the shape or invent a second escaping
grammar. `imageAssets` also accepts plain or `|`-separated paths for hand-typing.
`boxNumber` is not a column: it is derived from `order`. A full column reference
is in the app, under **Import / export → Column reference**.

Import is two-step and never silent: choosing a file produces a report only —
counts plus a row-level table of errors with CSV line numbers — and nothing is
written until you press **Apply**. Rejected rows can be downloaded as a CSV with
an added `importError` column, fixed, and re-imported. Choose **Add new only**
(default), **Update existing**, or **Replace everything**; only the latter two
change questions you already have.

### Images

The media picker offers the images listed in
[`data/media-manifest.json`](data/media-manifest.json). To add artwork, drop the
file into `public/media/puzzles/` and run `npm run media:manifest` — that file is
also what tells the validator which paths exist, since a static export cannot list
a directory at runtime.

Uploading is possible but secondary: with no backend, an upload is stored as a
base64 data URI inside the question, in this browser only, capped at 150 KB per
file. It will not move to another machine unless you export. Prefer
`public/media/puzzles/` for anything reused.

### Questions per session

The facilitator panel's **Questions per session** setting caps how many active
questions reach the wall (0 = all of them). If it exceeds the number of active
questions the admin and the game both warn, and the wall simply shows what
exists rather than failing.

## Facilitator controls

A gear button (bottom-left) opens the facilitator panel: open a specific box,
show hint, reveal, mark correct / not quite, next puzzle, skip, return to
boxes, reset, set questions per session, toggle timer / music / sound / mascot /
confetti, preview each mascot, full-screen, and a link out to
**Manage questions**. Keyboard: **H** hint · **R** reveal · **C** correct ·
**X** not quite · **N** next · **Z** zoom out · **F** full-screen · **Esc**
back to boxes.

## Mascots & audio

The male and female mascots — and their ElevenLabs voice lines — are the
approved assets reused unchanged from the Pop the Balloon Challenge. The
reaction videos play **muted**; the ElevenLabs recording is the single source
of truth for the voice and is played alongside the video from `t=0`, so only
one voice is ever heard. The mascot appears after Correct / Not Quite and stays
until **Next Puzzle** is clicked — it never auto-dismisses and never covers the
answer or the Next Puzzle button.

## State

Three `localStorage` keys:

| Key | Holds |
| --- | --- |
| `crackthebox.state.v2` | opened boxes, outcomes, running score |
| `crackthebox.settings.v1` | facilitator settings, including `adminPin` |
| `crackthebox.puzzles.v1` | the editable question bank (see [Questions](#questions)) |

A browser refresh mid-event resumes exactly where it left off. Opened boxes stay
in place on the wall (faded, with a check mark) and cannot be reselected.

Each save stamps a fingerprint of the question set it was played against. If the
bank changes mid-session the score would silently attach to different questions,
so the session is reset instead and the game says so. The admin warns before you
save while a game is in progress.

## Branding

Two partner logos sit at the outer edges of the header — Renaissance on the
left, SPE International on the right — configured in
[`lib/branding.ts`](lib/branding.ts) and loaded from
[`public/branding/`](public/branding). Both are local files: nothing is fetched
from the network during gameplay.

The supplied filenames are used exactly as provided:

| Side | File |
| --- | --- |
| left | `public/branding/renaissance-logo.png` (391 × 391) |
| right | `public/branding/spe_logo.png` (1536 × 1024) |

Swapping either one is a one-line change to `src` (and its `width`/`height`, which
only reserve layout space) in `lib/branding.ts`. Nothing else in the app writes a
`/branding/...` path.

> **Known limitation.** The supplied SPE file is a promotional graphic with a dark
> navy background baked in, not a transparent logo mark, so it reads as a dark
> rectangle against the light header. Dropping a transparent PNG or SVG into
> `public/branding/` and pointing `right.src` at it is the whole fix — the artwork
> is never recoloured, cropped or masked in code.

They render with `object-fit: contain` at a maximum height of
`clamp(44px, 5vw, 76px)`, so each keeps its own aspect ratio and its own width —
never stretched, cropped or recoloured, and never forced to match each other's
width. The game title stays centred on the true viewport midline because the
header's outer tracks are equal-width `1fr` columns, independent of how wide
either logo is; counters live on their own grid row, so a logo cannot overlap
one. On a short screen (≤ 800px tall, e.g. a 1366 × 768 projector) both logos and
the title step down a size. On a phone the title sits above a compact logo row.
If a logo file is missing the header falls back to a text wordmark rather than a
broken image.

The box wall uses the full header (logos, centred title, live counters, sound and
full-screen controls). The results screen uses the same full header with the title
only. The puzzle screen uses a slim variant that adds no vertical height, so the
puzzle keeps the whole stage.

## Deploying the static export

`npm run build` writes `./out`. Because `trailingSlash` is not set, the admin page
is emitted as `out/admin/questions.html` **and** there is an `out/admin/questions/`
directory beside it. Most static hosts resolve `/admin/questions` to the `.html`
file correctly, but a host configured to prefer directories may not — if
`/admin/questions` 404s or lists a directory, either enable clean-URL/`.html`
fallback on the host or link to `/admin/questions.html`.

Opening `out/index.html` directly over `file://` runs the game, but the
root-absolute links (including Manage questions) need a real HTTP server. Any
static server works:

```bash
npx serve out
python3 -m http.server -d out 8080
```
