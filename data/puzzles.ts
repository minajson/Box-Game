import type { Puzzle } from "@/lib/types";

/**
 * The bundled CRACK THE BOX question bank — the SEED, 60 puzzles.
 *
 * This file is the starting point, not the live set. The playable questions
 * come from `lib/puzzleStore.ts`, which loads the admin's saved bank from
 * localStorage and falls back to this array when there isn't one. Add, edit,
 * delete and reorder questions at the `/admin/questions` route, not here.
 *
 * Box numbers are assigned at runtime: the store takes the ACTIVE questions in
 * admin order and numbers them 1..N, so `boxNumber` below is only a seed
 * ordering hint.
 *
 * Distribution across the eleven supported types (Wild Card was removed):
 *   scramble 6 · rebus 5 · picture-word 5 · picture-combo 4 · emoji 5
 *   missing-letters 3 · zoom 5 · odd-one-out 3 · connect 4 · myth-fact 10
 *   clickable 10  =  60
 *
 * The Mental Wellbeing Myth or Fact questions have ids 51-60, new ids so a
 * session saved against the questions they replaced is not carried across. They
 * sit at boxes 15, 20, 29, 35, 40, 43, 48, 50, 54 and 56. The original 50 are
 * kept in `data/backups/`.
 *
 * The Security Awareness clickable challenges (ids 61-70), answered by clicking
 * rather than out loud, are spread one about every sixth box — 5, 11, 16, 22,
 * 28, 34, 39, 46, 52 and 58 — so a shorter session (which plays the FIRST N
 * questions) still gets some. Each is marked with a "Security Awareness"
 * comment. The other 50 keep their relative order; the 50 as they were before
 * this addition are in `data/backups/` too. Photos live in
 * public/media/puzzles/security/; hotspot areas are percentages of the scene
 * photo, measured against that exact file.
 *
 * Types are interleaved by box number, so consecutive picks feel varied
 * rather than marching through one category at a time.
 *
 * Editing guide
 * -------------
 * - `boxNumber` orders the seed. Keep them unique.
 * - `answer` is what the facilitator reveals; keep it UPPERCASE and short.
 * - Image-based puzzles list their files in `imageAssets`; components read
 *   images through `assetIndex`, so no path is ever hard-coded in the UI.
 * - `scrambledValue` MUST be a letter-for-letter permutation of `answer`.
 * - `maskedValue` uses `_` for each blank and must otherwise match `answer`.
 * - Myth or Fact: `clues[0]` is the statement, `answer` is MYTH or FACT, and
 *   `insight` is the explanation shown large on the reveal.
 * - Clickable: `interaction` is choice, hotspot or sequence. Choice cards mark
 *   `correct`; a sequence lists its cards in the right order; hotspot areas are
 *   percentages of the scene photo. `insight` is the required explanation.
 * - Run `npm run check:puzzles` after editing — it verifies all of the above.
 *
 * Themes: growth, feedback, teamwork, collaboration, communication,
 * leadership, listening, trust, creativity, innovation, adaptability,
 * learning, curiosity, connection, accountability, inclusion, respect,
 * ownership, potential, performance.
 */
export const PUZZLES: Puzzle[] = [
  // ================================================================ ROUND 1
  {
    id: 1,
    boxNumber: 1,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    scrambledValue: "WROGHT",
    answer: "GROWTH",
    hint: "The whole point of stepping outside your comfort zone.",
    insight: "Nobody ever grew inside their comfort zone.",
    imageAssets: [],
    revealAnimation: "rearrange",
  },
  {
    id: 2,
    boxNumber: 2,
    type: "rebus",
    categoryLabel: "REBUS!",
    prompt: "What word or phrase is hiding here?",
    rows: [
      { parts: [{ text: "STAND", size: "xl" }] },
      { divider: true },
      { parts: [{ text: "I", size: "xl" }] },
    ],
    answer: "I UNDERSTAND",
    hint: "One word is sitting UNDER the other one.",
    insight: "Listening to reply is easy. Listening to understand is the work.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  {
    id: 3,
    boxNumber: 3,
    type: "picture-word",
    categoryLabel: "PICTURE THIS!",
    prompt: "Read the picture, then the word",
    rows: [
      {
        parts: [
          { text: "FEED", size: "xl" },
          { emoji: "⬅️", size: "xl", caption: "BACK" },
        ],
      },
    ],
    answer: "FEEDBACK",
    hint: "A gift — when it is given well.",
    insight: "Wrap it with care. Open it with courage.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 4,
    boxNumber: 4,
    type: "picture-combo",
    categoryLabel: "PUT IT TOGETHER!",
    prompt: "Combine the pictures into one word",
    rows: [
      {
        parts: [
          { emoji: "👥", size: "xl", caption: "TEAM" },
          { text: "+", size: "lg", muted: true },
          { emoji: "🛠️", size: "xl", caption: "WORK" },
        ],
      },
    ],
    answer: "TEAMWORK",
    hint: "It makes the dream work.",
    insight: "None of us is as smart as all of us.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 61,
    boxNumber: 5,
    type: "clickable",
    interaction: "hotspot",
    categoryLabel: "THE DOOR THAT STAYED OPEN",
    category: "Security Awareness",
    prompt: "Can you identify the security breach?",
    scenario: "Staff are entering a restricted facility. Tap the person breaching security.",
    sceneAsset: 0,
    hotspots: [
      {
        id: "tailgater",
        label: "Tailgating — no badge used",
        areas: [{ x: 51.8, y: 24, w: 9, h: 68 }],
      },
    ],
    selectCount: 1,
    answer: "TAILGATING",
    hint: "Watch who actually uses a badge at the door.",
    insight:
      "Tailgating is unauthorised entry by following an authorised person through a controlled door. Everyone badges in — and it is fine to politely stop someone following you.",
    imageAssets: ["/media/puzzles/security/s51-entrance.webp"],
    revealAnimation: "highlight",
  },
  {
    id: 5,
    boxNumber: 6,
    type: "emoji",
    categoryLabel: "EMOJI DECODE!",
    prompt: "Decode the emojis into one word",
    rows: [
      {
        parts: [
          { emoji: "🧠", size: "xl" },
          { text: "+", size: "lg", muted: true },
          { emoji: "⛈️", size: "xl" },
        ],
      },
    ],
    answer: "BRAINSTORM",
    hint: "How a room full of ideas gets started.",
    insight: "The best idea in the room rarely arrives first.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 6,
    boxNumber: 7,
    type: "missing-letters",
    categoryLabel: "FILL THE GAPS!",
    prompt: "Complete the word",
    maskedValue: "L E _ D E _ S H _ P",
    answer: "LEADERSHIP",
    hint: "Not a title. A behaviour.",
    insight: "It is not the chair you sit in — it is what you do when nobody asked.",
    imageAssets: [],
    revealAnimation: "fill-letters",
  },
  {
    id: 7,
    boxNumber: 8,
    type: "zoom",
    categoryLabel: "ZOOM IN!",
    prompt: "What is this? Zoom out for more clues",
    answer: "A LIGHT BULB",
    hint: "It switches on the moment inspiration strikes.",
    insight: "Innovation is curiosity that refused to sit still.",
    imageAssets: ["/media/puzzles/zoom-lightbulb.svg"],
    revealAnimation: "zoom-out",
  },
  {
    id: 8,
    boxNumber: 9,
    type: "odd-one-out",
    categoryLabel: "ODD ONE OUT!",
    prompt: "Which one does NOT belong?",
    choices: [
      { id: "a", label: "LISTENING", emoji: "👂" },
      { id: "b", label: "ASKING", emoji: "❓" },
      { id: "c", label: "INTERRUPTING", emoji: "✋" },
      { id: "d", label: "SUMMARISING", emoji: "📝" },
    ],
    oddOneOutId: "c",
    answer: "INTERRUPTING",
    hint: "Three of them open a conversation. One shuts it down.",
    insight: "The other three are listening skills. This one is the opposite.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 9,
    boxNumber: 10,
    type: "connect",
    categoryLabel: "WHAT CONNECTS THEM?",
    prompt: "What do these three have in common?",
    clues: ["A TELESCOPE", "A MOUNTAIN TOP", "SOMEONE ELSE'S CHAIR"],
    answer: "PERSPECTIVE",
    hint: "Each one changes what you are able to see.",
    insight: "Same room. Different chair. Completely different view.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 62,
    boxNumber: 11,
    type: "clickable",
    interaction: "choice",
    categoryLabel: "ZOOM INTO TROUBLE",
    category: "Security Awareness",
    prompt: "What security-sensitive item is hidden in this image?",
    sceneAsset: 0,
    sceneZoom: true,
    // Right of the chip, so the first two stages show only chip, plastic and
    // green stripe — any of the four cards — and the face appears at stage 3.
    sceneFocus: { x: 56, y: 42 },
    options: [
      { id: "bank", label: "Bank debit card" },
      { id: "national-id", label: "National ID card" },
      { id: "access", label: "Employee access card", correct: true },
      { id: "visitor", label: "Visitor day pass" },
    ],
    answer: "EMPLOYEE ACCESS CARD",
    hint: "You carry it every working day — and the gate knows it is you.",
    insight:
      "Access credentials are personal and must never be shared or lent. Your card is your identity at every controlled door.",
    imageAssets: ["/media/puzzles/security/s52-access-card.webp"],
    revealAnimation: "highlight",
  },

  // ================================================================ ROUND 2
  {
    id: 10,
    boxNumber: 12,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    scrambledValue: "YITSUCRIO",
    answer: "CURIOSITY",
    hint: "The spark behind every great question.",
    insight: "The people who learn fastest are the ones still asking why.",
    imageAssets: [],
    revealAnimation: "rearrange",
  },
  {
    id: 11,
    boxNumber: 13,
    type: "rebus",
    categoryLabel: "REBUS!",
    prompt: "What phrase is hiding here?",
    rows: [
      {
        parts: [
          { text: "THINK", size: "xl" },
          { boxed: true, size: "xl" },
        ],
      },
    ],
    answer: "THINK OUTSIDE THE BOX",
    hint: "Look at exactly where the word is sitting.",
    insight: "You are playing a game about boxes. Now think outside one.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  {
    id: 12,
    boxNumber: 14,
    type: "picture-word",
    categoryLabel: "PICTURE THIS!",
    prompt: "Say the picture out loud, then add the word",
    rows: [
      {
        parts: [
          { emoji: "🐝", size: "xl", caption: "BEE" },
          { text: "+", size: "lg", muted: true },
          { text: "LEAF", size: "xl" },
        ],
      },
    ],
    answer: "BELIEF",
    hint: "Say the two sounds together — quickly.",
    insight: "Teams do not run on strategy alone. They run on belief in each other.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 51,
    boxNumber: 15,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["Mental health problems are a sign of personal weakness."],
    answer: "MYTH",
    hint: "Think about what really causes them.",
    insight: "They have nothing to do with being weak or lazy. Biological, psychological and social factors all play a part.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 63,
    boxNumber: 16,
    type: "clickable",
    interaction: "choice",
    categoryLabel: "WHO GETS THROUGH?",
    category: "Security Awareness",
    prompt: "Who should be granted access?",
    scenario: "Four people ask to enter a restricted facility.",
    // Every caption is a reason someone might wave them through. Only one is a
    // check against an approved record; the rest are rank, familiarity or haste.
    options: [
      { id: "manager", label: "Senior manager", detail: "Says the MD asked them to inspect the site today", assetIndex: 0 },
      { id: "technician", label: "Technician", detail: "Name and ID match today's work order at the gate", assetIndex: 1, correct: true },
      { id: "employee", label: "Employee", detail: "Works here daily — left her badge at home; a colleague vouches for her", assetIndex: 2 },
      { id: "visitor", label: "Visitor", detail: "Shows a meeting invite on her phone; her host is running late", assetIndex: 3 },
    ],
    answer: "B — THE TECHNICIAN ON TODAY'S WORK ORDER",
    hint: "Ignore the job titles. Which one has been checked against a record?",
    insight:
      "Access is determined by verified authorisation — not seniority, familiarity or urgency. Only the technician has been matched to an approved record; the others need checking first.",
    imageAssets: [
      "/media/puzzles/security/s53-person-1.webp",
      "/media/puzzles/security/s53-person-2.webp",
      "/media/puzzles/security/s53-person-3.webp",
      "/media/puzzles/security/s53-person-4.webp",
    ],
    revealAnimation: "highlight",
  },
  {
    id: 14,
    boxNumber: 17,
    type: "emoji",
    categoryLabel: "EMOJI DECODE!",
    prompt: "Decode the emojis into a familiar phrase",
    rows: [
      {
        parts: [
          { emoji: "🚶", size: "xl" },
          { emoji: "👟", size: "xl" },
          { emoji: "🧑", size: "xl" },
        ],
      },
    ],
    answer: "WALK IN SOMEONE ELSE'S SHOES",
    hint: "Five words. It is the definition of empathy.",
    insight: "You cannot lead people you have never tried to understand.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  {
    id: 15,
    boxNumber: 18,
    type: "missing-letters",
    categoryLabel: "FILL THE GAPS!",
    prompt: "Complete the word",
    maskedValue: "C O _ _ A B O R A _ I O N",
    answer: "COLLABORATION",
    hint: "Thirteen letters. Always better than working alone.",
    insight: "Alone we go faster. Together we go further.",
    imageAssets: [],
    revealAnimation: "fill-letters",
  },
  {
    id: 16,
    boxNumber: 19,
    type: "zoom",
    categoryLabel: "ZOOM IN!",
    prompt: "What is this? Zoom out for more clues",
    answer: "A COMPASS",
    hint: "It never tells you the distance — only the direction.",
    insight: "A team without direction just moves. A team with one travels.",
    imageAssets: ["/media/puzzles/zoom-compass.svg"],
    revealAnimation: "zoom-out",
  },
  {
    id: 52,
    boxNumber: 20,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["A little stress can help you focus and get things done."],
    answer: "FACT",
    hint: "Think about a deadline.",
    insight: "Some stress can motivate us. If it's constant or affecting daily life, it's time to seek support.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 18,
    boxNumber: 21,
    type: "connect",
    categoryLabel: "WHAT CONNECTS THEM?",
    prompt: "What do these three have in common?",
    clues: ["A RUBBER BAND", "BAMBOO IN A STORM", "A BOXER GETTING BACK UP"],
    answer: "RESILIENCE",
    hint: "Each one bends — and none of them break.",
    insight: "Bamboo survives the storm precisely because it bends.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 64,
    boxNumber: 22,
    type: "clickable",
    interaction: "hotspot",
    categoryLabel: "THE 10-SECOND MISTAKE",
    category: "Security Awareness",
    prompt: "Find the three security risks at this empty desk.",
    scenario: "The owner stepped away “for just ten seconds”. Tap all three risks.",
    sceneAsset: 0,
    hotspots: [
      {
        id: "screen",
        label: "Unlocked computer",
        areas: [{ x: 32, y: 15, w: 38.5, h: 41 }],
      },
      {
        id: "documents",
        label: "Confidential documents",
        areas: [
          { x: 2, y: 60, w: 20.5, h: 20 },
          { x: 16, y: 68, w: 20, h: 20 },
        ],
      },
      {
        id: "badge",
        label: "Unattended badge",
        areas: [
          { x: 70.5, y: 72, w: 8, h: 9.5 },
          { x: 76, y: 66, w: 13.5, h: 8.5 },
        ],
      },
    ],
    selectCount: 3,
    answer: "UNLOCKED PC, PAPERS AND BADGE",
    hint: "Think screen, paper and plastic.",
    insight:
      "Lock your screen (Windows + L), put confidential papers away and keep your badge on you — every time you leave your desk.",
    imageAssets: ["/media/puzzles/security/s54-workstation.webp"],
    revealAnimation: "highlight",
  },

  // ================================================================ ROUND 3
  {
    id: 19,
    boxNumber: 23,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    scrambledValue: "SILENT",
    answer: "LISTEN",
    hint: "The scrambled word is a clue in itself. Same six letters.",
    insight: "LISTEN and SILENT use the very same letters. That is not a coincidence.",
    imageAssets: [],
    revealAnimation: "rearrange",
  },
  {
    id: 20,
    boxNumber: 24,
    type: "rebus",
    categoryLabel: "REBUS!",
    prompt: "What phrase is hiding here?",
    rows: [
      {
        parts: [
          { text: "TEAM", size: "xl" },
          { text: "I", size: "xl", strike: true },
        ],
      },
    ],
    answer: "THERE IS NO I IN TEAM",
    hint: "One letter has been crossed out for a reason.",
    insight: "There is no I in TEAM — but there is one in WIN. Both matter.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  {
    id: 21,
    boxNumber: 25,
    type: "picture-word",
    categoryLabel: "PICTURE THIS!",
    prompt: "Say the picture out loud, then add the letters",
    rows: [
      {
        parts: [
          { emoji: "👁️", size: "xl", caption: "EYE" },
          { text: "+", size: "lg", muted: true },
          { text: "DEA", size: "xl" },
        ],
      },
    ],
    answer: "IDEA",
    hint: "The picture is a letter, not a word.",
    insight: "Every innovation on earth started as somebody's half-formed idea.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 22,
    boxNumber: 26,
    type: "picture-combo",
    categoryLabel: "PUT IT TOGETHER!",
    prompt: "Combine the pictures into one word",
    rows: [
      {
        parts: [
          { emoji: "🧊", size: "xl", caption: "ICE" },
          { text: "+", size: "lg", muted: true },
          { emoji: "🔨", size: "xl", caption: "BREAKER" },
        ],
      },
    ],
    answer: "ICEBREAKER",
    hint: "Every good workshop starts with one.",
    insight: "The fastest way into a room is to break the ice, not the silence.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 23,
    boxNumber: 27,
    type: "emoji",
    categoryLabel: "EMOJI DECODE!",
    prompt: "Decode the emojis into a familiar phrase",
    rows: [
      {
        parts: [
          { emoji: "🐘", size: "xl" },
          { emoji: "🏠", size: "xl" },
        ],
      },
    ],
    answer: "THE ELEPHANT IN THE ROOM",
    hint: "The thing everybody can see, and nobody will name.",
    insight: "Every team has one. The best teams say it out loud.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 65,
    boxNumber: 28,
    type: "clickable",
    interaction: "hotspot",
    categoryLabel: "THE URGENT MESSAGE",
    category: "Security Awareness",
    prompt: "Which two details suggest this message may be fraudulent?",
    scenario: "This email has just arrived. Tap the two warning signs.",
    sceneAsset: 0,
    // Measured from scripts/security-assets/email-55.html. The labels sit to
    // the right of the subject line and the button, in space left empty for
    // them, so they never cover the words the room is reading.
    hotspots: [
      {
        id: "sender-link",
        label: "Fake sender & password link",
        labelArea: 1,
        labelSide: "right",
        areas: [
          { x: 2.5, y: 21.5, w: 76.5, h: 10.5 },
          { x: 2.5, y: 75.5, w: 33, h: 11.5 },
          // "please confirm your password" — the request is the same warning
          // sign as the button, so a click on either finds this hotspot once.
          { x: 48, y: 49, w: 31, h: 6 },
        ],
      },
      {
        id: "pressure",
        label: "Pressure to act now",
        labelArea: 0,
        labelSide: "right",
        areas: [
          { x: 2.5, y: 11.5, w: 66.5, h: 9 },
          { x: 2.5, y: 61.5, w: 94.5, h: 13 },
        ],
      },
    ],
    selectCount: 2,
    answer: "SUSPICIOUS SENDER/LINK + PRESSURE TO ACT",
    hint: "Check who really sent it, what it asks you to do — and how it makes you feel.",
    insight:
      "The sender's domain is not ours, IT never asks for a password through an email link, and the 30-minute threat is there to rush you. Don't click — report it to IT.",
    imageAssets: ["/media/puzzles/security/s55-urgent-email.webp"],
    revealAnimation: "highlight",
  },
  {
    id: 53,
    boxNumber: 29,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["People with mental health conditions can't handle demanding jobs."],
    answer: "MYTH",
    hint: "Look at the word \"can't\".",
    insight: "Many people can be just as productive as their colleagues, especially when their condition is well managed.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 25,
    boxNumber: 30,
    type: "zoom",
    categoryLabel: "ZOOM IN!",
    prompt: "What is this? Zoom out for more clues",
    answer: "A KEY",
    hint: "Small, ordinary — and completely useless until it meets the right lock.",
    insight: "Potential is a key. Opportunity is the lock.",
    imageAssets: ["/media/puzzles/zoom-key.svg"],
    revealAnimation: "zoom-out",
  },
  {
    id: 26,
    boxNumber: 31,
    type: "odd-one-out",
    categoryLabel: "ODD ONE OUT!",
    prompt: "Which one does NOT belong?",
    choices: [
      { id: "a", label: "COACHING", emoji: "🧭" },
      { id: "b", label: "DELEGATING", emoji: "🙌" },
      { id: "c", label: "MICROMANAGING", emoji: "🔬" },
      { id: "d", label: "SETTING DIRECTION", emoji: "🗺️" },
    ],
    oddOneOutId: "c",
    answer: "MICROMANAGING",
    hint: "Three of them grow people. One of them shrinks them.",
    insight: "Trust is the only one of these you cannot fake.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 27,
    boxNumber: 32,
    type: "connect",
    categoryLabel: "WHAT CONNECTS THEM?",
    prompt: "What do these three have in common?",
    clues: ["A PIANIST", "A SURGEON", "AN OLYMPIAN"],
    answer: "PRACTICE",
    hint: "None of them were born able to do it.",
    insight: "Nobody is a natural. They were all a beginner who kept going.",
    imageAssets: [],
    revealAnimation: "fade",
  },

  // ================================================================ ROUND 4
  {
    id: 28,
    boxNumber: 33,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    scrambledValue: "SPECTRE",
    answer: "RESPECT",
    hint: "Everyone wants it. It is only ever earned.",
    insight: "It costs nothing to give, and everything to lose.",
    imageAssets: [],
    revealAnimation: "rearrange",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 66,
    boxNumber: 34,
    type: "clickable",
    interaction: "choice",
    categoryLabel: "EYES EVERYWHERE",
    category: "Security Awareness",
    prompt: "Which one establishes whether someone is permitted to enter a restricted area?",
    options: [
      { id: "cctv", label: "CCTV camera", assetIndex: 0 },
      { id: "badge", label: "Employee ID badge", assetIndex: 1 },
      { id: "door", label: "Locked security door", assetIndex: 2 },
      { id: "record", label: "Access record", assetIndex: 3, correct: true },
    ],
    answer: "D — THE ACCESS AUTHORISATION RECORD",
    hint: "Which one is a decision, not a device?",
    insight:
      "Authorisation determines permission. The badge says who you are, the camera watches and the door enforces — but only the approved record decides who may enter.",
    imageAssets: [
      "/media/puzzles/security/s56-cctv.webp",
      "/media/puzzles/security/s56-id-badge.webp",
      "/media/puzzles/security/s56-locked-door.webp",
      "/media/puzzles/security/s56-access-record.webp",
    ],
    revealAnimation: "highlight",
  },
  {
    id: 54,
    boxNumber: 35,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["Regular physical activity can lift your mood."],
    answer: "FACT",
    hint: "Think about how you feel after a walk.",
    insight: "Being active can boost mood, self-esteem, sleep and energy. You don't need a gym to start.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 30,
    boxNumber: 36,
    type: "picture-word",
    categoryLabel: "PICTURE THIS!",
    prompt: "Say the picture out loud, then add the word",
    rows: [
      {
        parts: [
          { emoji: "🧢", size: "xl", caption: "CAP" },
          { text: "+", size: "lg", muted: true },
          { text: "ABLE", size: "xl" },
        ],
      },
    ],
    answer: "CAPABLE",
    hint: "Say the two parts together. It describes everyone in this room.",
    insight: "People rise to the level of what you believe they are capable of.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 31,
    boxNumber: 37,
    type: "picture-combo",
    categoryLabel: "PUT IT TOGETHER!",
    prompt: "Combine the pictures into one phrase",
    rows: [
      {
        parts: [
          { emoji: "🌱", size: "xl", caption: "GROWTH" },
          { text: "+", size: "lg", muted: true },
          { emoji: "🧠", size: "xl", caption: "MINDSET" },
        ],
      },
    ],
    answer: "GROWTH MINDSET",
    hint: "Two words. It is the belief that ability can be built.",
    insight: "\"I cannot do this\" — add one word: \"yet\".",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 32,
    boxNumber: 38,
    type: "emoji",
    categoryLabel: "EMOJI DECODE!",
    prompt: "Decode this into a familiar saying",
    rows: [
      {
        parts: [
          { emoji: "2️⃣", size: "xl" },
          { emoji: "🧠", size: "xl" },
          { text: ">", size: "lg", muted: true },
          { emoji: "1️⃣", size: "xl" },
          { emoji: "🧠", size: "xl" },
        ],
      },
    ],
    answer: "TWO HEADS ARE BETTER THAN ONE",
    hint: "Read the maths out loud.",
    insight: "The point of a meeting is the second head. Use it.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 67,
    boxNumber: 39,
    type: "clickable",
    interaction: "sequence",
    categoryLabel: "THE VISITOR'S SHORTCUT",
    category: "Security Awareness",
    prompt: "Put this site's visitor check-in steps in order.",
    scenario:
      "A visitor nobody at reception recognises arrives for a meeting. Each step needs the one before it. Tap the cards in order, 1 to 4.",
    // Listed in the RIGHT order; the game shows them shuffled. Each step is
    // worded so it depends on the one before — the authorisation check matches
    // the ID to an approved visit, so it cannot come first — which makes this
    // order the only defensible one even though sites differ in the detail.
    options: [
      { id: "identity", label: "Check their photo ID", assetIndex: 0 },
      { id: "authorisation", label: "Confirm that ID matches an approved visit", assetIndex: 1 },
      { id: "registration", label: "Sign them in and issue a visitor badge", assetIndex: 2 },
      { id: "escort", label: "Hand them to their escort", assetIndex: 3 },
    ],
    answer: "IDENTITY → AUTHORISATION → REGISTRATION → ESCORT",
    hint: "What does each step need to be done already?",
    insight:
      "You can only match someone to an approved visit once you have seen their ID, you only sign in and badge an approved visitor, and only a badged visitor is escorted through. Sites differ in the detail — follow yours — but none lets an unchecked person in.",
    imageAssets: [
      "/media/puzzles/security/s57-step-identity.webp",
      "/media/puzzles/security/s57-step-authorisation.webp",
      "/media/puzzles/security/s57-step-registration.webp",
      "/media/puzzles/security/s57-step-escort.webp",
    ],
    revealAnimation: "highlight",
  },
  {
    id: 55,
    boxNumber: 40,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["People with mental health conditions are usually violent."],
    answer: "MYTH",
    hint: "Look at the word \"usually\".",
    insight: "Most are no more likely to be violent than anyone else. People with severe mental illness are far more likely to be victims of violent crime.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 34,
    boxNumber: 41,
    type: "zoom",
    categoryLabel: "ZOOM IN!",
    prompt: "What is this? Zoom out for more clues",
    answer: "A JIGSAW PUZZLE PIECE",
    hint: "On its own it means nothing. It only makes sense next to the others.",
    insight: "Every single person here is one of these. So is the person beside you.",
    imageAssets: ["/media/puzzles/zoom-puzzle-piece.svg"],
    revealAnimation: "zoom-out",
  },
  {
    id: 35,
    boxNumber: 42,
    type: "odd-one-out",
    categoryLabel: "ODD ONE OUT!",
    prompt: "Which behaviour does NOT build trust?",
    choices: [
      { id: "a", label: "KEEPING PROMISES", emoji: "🤝" },
      { id: "b", label: "OWNING MISTAKES", emoji: "🛡️" },
      { id: "c", label: "SAYING WHAT THEY WANT TO HEAR", emoji: "🎭" },
      { id: "d", label: "BEING TRANSPARENT", emoji: "🔍" },
    ],
    oddOneOutId: "c",
    answer: "SAYING WHAT THEY WANT TO HEAR",
    hint: "Three are honest. One is merely comfortable.",
    insight: "Comfortable lies feel kind today and cost you everything tomorrow.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 56,
    boxNumber: 43,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["Once you have a mental health condition, you can never recover."],
    answer: "MYTH",
    hint: "Look at the word \"never\".",
    insight: "Effective support exists. Many people recover fully or manage their symptoms and live full lives.",
    imageAssets: [],
    revealAnimation: "highlight",
  },

  // ================================================================ ROUND 5
  {
    id: 37,
    boxNumber: 44,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    scrambledValue: "STRUT",
    answer: "TRUST",
    hint: "Slow to build. Quick to lose. Five letters.",
    insight: "It arrives on foot and leaves on horseback.",
    imageAssets: [],
    revealAnimation: "rearrange",
  },
  {
    id: 38,
    boxNumber: 45,
    type: "rebus",
    categoryLabel: "REBUS!",
    prompt: "What phrase is hiding here?",
    rows: [
      { divider: true },
      { parts: [{ text: "READING", size: "xl" }] },
      { divider: true },
    ],
    answer: "READING BETWEEN THE LINES",
    hint: "Look at where the word has been placed.",
    insight: "Half of what a colleague tells you is in what they did not say.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 68,
    boxNumber: 46,
    type: "clickable",
    interaction: "choice",
    categoryLabel: "THE BADGE ON THE FLOOR",
    category: "Security Awareness",
    prompt: "What should you do?",
    scenario: "You find an unfamiliar employee access badge near a restricted facility.",
    sceneAsset: 0,
    // Every wrong answer is something a helpful colleague might do. None of them
    // gets the card switched off.
    options: [
      { id: "leave", label: "Leave it where it is so the owner can retrace their steps" },
      { id: "colleague", label: "Give it to someone who works inside to return it" },
      { id: "chat", label: "Ask in the team chat whether anyone has lost a badge" },
      { id: "report", label: "Hand it to security or report it as found straight away", correct: true },
    ],
    answer: "HAND IT IN OR REPORT IT PROMPTLY",
    hint: "Who can switch a lost card off?",
    insight:
      "Lost credentials must be secured and reported promptly so access can be disabled where necessary. Leaving it, passing it on or asking around all keep a working card in circulation.",
    imageAssets: ["/media/puzzles/security/s58-badge-floor.webp"],
    revealAnimation: "highlight",
  },
  {
    id: 39,
    boxNumber: 47,
    type: "picture-word",
    categoryLabel: "PICTURE THIS!",
    prompt: "Say the picture out loud, then add the letters",
    rows: [
      {
        parts: [
          { emoji: "🥧", size: "xl", caption: "PIE" },
          { text: "+", size: "lg", muted: true },
          { text: "ONEER", size: "xl" },
        ],
      },
    ],
    answer: "PIONEER",
    hint: "Someone who goes first, so others can follow.",
    insight: "Somebody had to be the first to try it. It might as well be you.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  {
    id: 57,
    boxNumber: 48,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["Poor sleep can make stress worse."],
    answer: "FACT",
    hint: "Think about the day after a bad night.",
    insight: "Poor sleep and stress can feed each other, so protecting your sleep is a real wellbeing habit.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 41,
    boxNumber: 49,
    type: "emoji",
    categoryLabel: "EMOJI DECODE!",
    prompt: "Decode the emojis into a familiar phrase",
    rows: [
      {
        parts: [
          { emoji: "🧊", size: "xl" },
          { emoji: "🗻", size: "xl" },
        ],
      },
    ],
    answer: "THE TIP OF THE ICEBERG",
    hint: "What you can see is the small part.",
    insight: "The problem you can see is rarely the problem you have.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  {
    id: 58,
    boxNumber: 50,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["Mental health only matters if you have a diagnosis."],
    answer: "MYTH",
    hint: "Compare it with physical health.",
    insight: "Everyone has mental health, just as everyone has physical health. It shifts over time and deserves care at every stage.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 43,
    boxNumber: 51,
    type: "zoom",
    categoryLabel: "ZOOM IN!",
    prompt: "What is this? Zoom out for more clues",
    answer: "A SEEDLING",
    hint: "Give it time, light and a little patience.",
    insight: "Nobody ever pulled a plant up to make it grow faster.",
    imageAssets: ["/media/puzzles/zoom-seedling.svg"],
    revealAnimation: "zoom-out",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 69,
    boxNumber: 52,
    type: "clickable",
    interaction: "choice",
    categoryLabel: "ACCESS GRANTED… OR NOT?",
    category: "Security Awareness",
    prompt: "What does this mean?",
    scenario:
      "An employee moved to another department, but their old access card still opens a restricted door.",
    sceneAsset: 0,
    // Common beliefs: the system must be right, HR will catch it, someone must
    // have agreed. The correct card is no longer the only long, careful one.
    options: [
      { id: "system", label: "If the card still opens it, they are still allowed in" },
      { id: "hr", label: "It is fine until HR finishes processing the move" },
      { id: "manager", label: "Their old manager must have agreed to keep it active" },
      { id: "technical", label: "The card works, but they may no longer be authorised", correct: true },
    ],
    answer: "ACCESS IS NOT THE SAME AS AUTHORISATION",
    hint: "Just because a door opens…",
    insight:
      "Access rights must reflect current job responsibilities and approved permissions. A door that opens proves only that nobody removed the access — if your card opens a door it should not, report it.",
    imageAssets: ["/media/puzzles/security/s59-old-card.webp"],
    revealAnimation: "highlight",
  },
  {
    id: 44,
    boxNumber: 53,
    type: "connect",
    categoryLabel: "WHAT CONNECTS THEM?",
    prompt: "What do these three have in common?",
    clues: ["A TOOLBOX", "A GARDEN", "AN ORCHESTRA"],
    answer: "DIVERSITY",
    hint: "Each one works BECAUSE the parts are not the same.",
    insight: "A toolbox of identical spanners cannot fix very much.",
    imageAssets: [],
    revealAnimation: "fade",
  },

  // ================================================================ ROUND 6
  {
    id: 59,
    boxNumber: 54,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["Depression and anxiety cost the world about 12 billion working days a year."],
    answer: "FACT",
    hint: "The number is meant to surprise you.",
    insight: "That's a World Health Organization estimate, costing about US$1 trillion a year. Supportive workplaces matter.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 46,
    boxNumber: 55,
    type: "rebus",
    categoryLabel: "REBUS!",
    prompt: "What phrase is hiding here?",
    rows: [
      {
        parts: [
          { text: "YOU", size: "lg" },
          { text: "JUST", size: "xl" },
          { text: "ME", size: "lg" },
        ],
      },
    ],
    answer: "JUST BETWEEN YOU AND ME",
    hint: "Look carefully at WHERE the word JUST is sitting.",
    insight: "The most honest conversations happen in the smallest rooms.",
    imageAssets: [],
    revealAnimation: "fade",
  },
  {
    id: 60,
    boxNumber: 56,
    type: "myth-fact",
    categoryLabel: "MYTH OR FACT?",
    category: "Mental Wellbeing",
    prompt: "Is this statement a myth or a fact?",
    clues: ["If someone seems to be struggling, it's better not to ask."],
    answer: "MYTH",
    hint: "What would you want a friend to do?",
    insight: "A caring question and real listening can help someone feel less alone. You don't need to have all the answers.",
    imageAssets: [],
    revealAnimation: "highlight",
  },
  {
    id: 48,
    boxNumber: 57,
    type: "picture-combo",
    categoryLabel: "PUT IT TOGETHER!",
    prompt: "Combine the pictures into one phrase",
    rows: [
      {
        parts: [
          { emoji: "💬", size: "xl", caption: "WORD" },
          { text: "+", size: "lg", muted: true },
          { emoji: "👄", size: "xl", caption: "MOUTH" },
        ],
      },
    ],
    answer: "WORD OF MOUTH",
    hint: "Three words. It is how a reputation actually travels.",
    insight: "Your reputation is what people say when you have left the room.",
    imageAssets: [],
    revealAnimation: "combine",
  },
  // Security Awareness (clickable) — see the note at the top of this file.
  {
    id: 70,
    boxNumber: 58,
    type: "clickable",
    interaction: "choice",
    categoryLabel: "THE QR CODE TRAP",
    category: "Security Awareness",
    prompt: "What is the safest action before entering personal or company information?",
    scenario: "This poster has appeared near the lifts.",
    sceneAsset: 0,
    sceneZoom: true,
    sceneFocus: { x: 50, y: 54 },
    // Each wrong answer is a precaution people really take, and none of them
    // checks whether the offer is genuine.
    options: [
      { id: "url-check", label: "Scan it, and only continue if the web page looks official" },
      { id: "email-only", label: "Scan it, but enter only your staff email, not your password" },
      { id: "verify", label: "Confirm it is genuine with HR or IT through a known channel first", correct: true },
      { id: "personal", label: "Scan it on your personal phone rather than a work device" },
    ],
    answer: "VERIFY THROUGH A TRUSTED CHANNEL",
    hint: "Who could confirm this offer is real?",
    insight:
      "QR codes can lead to fraudulent websites, and a fake page can look official on any phone. Verify legitimacy through an approved channel before entering sensitive information.",
    imageAssets: ["/media/puzzles/security/s60-qr-poster.webp"],
    revealAnimation: "highlight",
  },
  {
    id: 49,
    boxNumber: 59,
    type: "missing-letters",
    categoryLabel: "FILL THE GAPS!",
    prompt: "Complete the word",
    maskedValue: "A D _ P T A _ I L I _ Y",
    answer: "ADAPTABILITY",
    hint: "Not the strongest. Not the smartest. The one that adjusts.",
    insight: "The plan is not the point. Responding when it breaks is the point.",
    imageAssets: [],
    revealAnimation: "fill-letters",
  },
  {
    id: 50,
    boxNumber: 60,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    scrambledValue: "OILSUNCIN",
    answer: "INCLUSION",
    hint: "Diversity is being invited. This is being asked to dance.",
    insight: "Do not just make room at the table. Ask the person to speak.",
    imageAssets: [],
    revealAnimation: "rearrange",
  },
];

// ---- END OF PUZZLES ----
// scripts/validate-puzzles.mjs reads the array above by evaluating everything
// before this sentinel. Keep it here, directly after the closing bracket.
