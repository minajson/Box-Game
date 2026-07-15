# CRACK THE BOX

**Pick it. Open it. Solve it.** — a live, big-screen audience puzzle game for
**Renaissance People Day**.

Fifty numbered mystery boxes hide fifty visual puzzles. The audience picks a
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

Regenerate the offline audio (optional — checked-in copies already exist):

```bash
npm run sfx          # sound effects  → public/media/sfx
npm run music        # background loop → public/media/audio
npm run check:puzzles  # validate data/puzzles.ts
```

## Puzzle types

Nine types, two-to-seven of each across the 50 boxes: **Scramble**, **Rebus**,
**Picture + Word**, **Picture Combination**, **Emoji Decode**, **Missing
Letters**, **Zoom In**, **Odd One Out**, and **What Connects Them?**

Puzzles live in [`data/puzzles.ts`](data/puzzles.ts) — a plain, editable data
structure. Images are referenced only through each puzzle's `imageAssets`
array (never hard-coded in a component) and live in
[`public/media/puzzles/`](public/media/puzzles). Run `npm run check:puzzles`
after editing: it verifies every box maps to one unique puzzle, scrambles are
true permutations of their answers, masked letters line up, and no answer
repeats.

## Facilitator controls

A gear button (bottom-left) opens the facilitator panel: open a specific box,
show hint, reveal, mark correct / not quite, next puzzle, skip, return to
boxes, reset, toggle timer / music / sound / mascot / confetti, preview each
mascot, and full-screen. Keyboard: **H** hint · **R** reveal · **C** correct ·
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

Opened boxes, the running score and the settings persist in `localStorage`, so
a browser refresh mid-event resumes exactly where it left off. Opened boxes
stay in place on the wall (faded, with a check mark) and cannot be reselected.

## Branding

The only event branding is a small **RENAISSANCE PEOPLE DAY** identifier with a
green highlight. No logo, no logo placeholder, no sidebar.
