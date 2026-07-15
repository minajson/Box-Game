/**
 * Generates the seamless background-music loop, offline and dependency-free.
 *
 *   npm run music  →  public/media/audio/background-music.wav
 *
 * Brief: upbeat, playful, anticipatory, instrumental, professional — the bed
 * under a TV game show, not a children's cartoon. It sits at ~12% volume and
 * ducks to ~30% of that while the mascot speaks.
 *
 * The loop is bar-aligned and the tail wraps into the head, so `loop = true`
 * on an <audio> element is genuinely seamless — the track never restarts
 * between screens.
 *
 * A licensed MP3 dropped in at public/media/audio/background-music.mp3 is
 * preferred automatically; this WAV is the fallback.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "media",
  "audio",
);
mkdirSync(OUT, { recursive: true });

const BPM = 116;
const beat = 60 / BPM;
const bar = beat * 4;
const BARS = 16;
const totalSec = bar * BARS;
const N = Math.floor(SR * totalSec);

/** Equal temperament, A4 = 440. */
function freq(name) {
  const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  let semis = map[m[1]];
  if (m[2] === "#") semis += 1;
  if (m[2] === "b") semis -= 1;
  const midi = semis + (parseInt(m[3], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const out = new Float32Array(N);

/** Write a note into the mix with a shaped envelope. Wraps past the end. */
function play(startSec, durSec, f, { type = "sine", vol = 0.2, attack = 0.01, release = 0.25 } = {}) {
  const start = Math.floor(startSec * SR);
  const n = Math.floor(durSec * SR);
  const a = Math.max(1, Math.floor(attack * SR));
  const r = Math.max(1, Math.floor(release * SR));
  for (let i = 0; i < n; i++) {
    let env;
    if (i < a) env = i / a;
    else if (i > n - r) env = Math.max(0, (n - i) / r);
    else env = 1;
    const t = i / SR;
    const phase = 2 * Math.PI * f * t;
    let v;
    if (type === "triangle") v = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else if (type === "square") v = Math.sign(Math.sin(phase)) * 0.5;
    else if (type === "saw") v = 2 * (t * f - Math.floor(0.5 + t * f));
    else if (type === "pluck") {
      // Slight detune + fast decay reads as a marimba / plucked stab.
      v =
        (Math.sin(phase) + 0.5 * Math.sin(phase * 2.01) + 0.25 * Math.sin(phase * 3.02)) /
        1.75;
      env *= Math.pow(1 - i / n, 1.6);
    } else v = Math.sin(phase);
    // Loop-safe: anything past the end wraps to the top of the track.
    out[(start + i) % N] += v * vol * env;
  }
}

/** Short filtered-noise hit — the light percussion keeping the pulse. */
function hit(startSec, durSec, { vol = 0.12, cutoff = 4500, power = 3 } = {}) {
  const start = Math.floor(startSec * SR);
  const n = Math.floor(durSec * SR);
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = 1 / SR / (rc + 1 / SR);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const raw = Math.random() * 2 - 1;
    prev += alpha * (raw - prev);
    const env = Math.pow(1 - i / n, power);
    out[(start + i) % N] += prev * vol * env;
  }
}

// --- Arrangement --------------------------------------------------------
// A bright, major-key vamp with a light anticipation lift every 4 bars.
// I–vi–IV–V in C: C  Am  F  G  — familiar, upbeat, never saccharine.
const PROG = [
  { root: "C3", triad: ["C4", "E4", "G4"] },
  { root: "A2", triad: ["A3", "C4", "E4"] },
  { root: "F2", triad: ["F3", "A3", "C4"] },
  { root: "G2", triad: ["G3", "B3", "D4"] },
];

for (let b = 0; b < BARS; b++) {
  const t0 = b * bar;
  const chord = PROG[b % PROG.length];
  const lastOfPhrase = b % 4 === 3;

  // Bass: root on 1 and 3, with a walk-up on the turnaround bar.
  play(t0, beat * 0.9, freq(chord.root), { type: "triangle", vol: 0.3, release: 0.1 });
  play(t0 + beat * 2, beat * 0.9, freq(chord.root), {
    type: "triangle",
    vol: 0.26,
    release: 0.1,
  });
  if (lastOfPhrase) {
    play(t0 + beat * 3, beat * 0.45, freq("D3"), { type: "triangle", vol: 0.2 });
    play(t0 + beat * 3.5, beat * 0.45, freq("F3"), { type: "triangle", vol: 0.2 });
  }

  // Pad: soft sustained triad, the "professional" glue underneath.
  for (const note of chord.triad) {
    play(t0, bar * 0.98, freq(note), {
      type: "sine",
      vol: 0.055,
      attack: 0.18,
      release: 0.4,
    });
  }

  // Arpeggio: the playful game-show sparkle, eighth notes across the triad.
  const arp = [...chord.triad, chord.triad[1]];
  for (let i = 0; i < 8; i++) {
    const note = arp[i % arp.length];
    const octave = i >= 4 ? 2 : 1; // second half lifts an octave — anticipation
    play(t0 + i * beat * 0.5, beat * 0.44, freq(note) * octave, {
      type: "pluck",
      vol: i % 2 === 0 ? 0.115 : 0.075,
      attack: 0.004,
    });
  }

  // Percussion: soft kick pulse + off-beat shaker. Keeps energy without drums.
  for (let i = 0; i < 4; i++) {
    play(t0 + i * beat, 0.09, 62, { type: "sine", vol: 0.24, attack: 0.002, release: 0.07 });
    hit(t0 + i * beat + beat * 0.5, 0.06, { vol: 0.05, cutoff: 7000 });
  }
  hit(t0 + beat * 2, 0.14, { vol: 0.09, cutoff: 3200, power: 2.4 }); // backbeat

  // Every 4 bars, a rising 3-note lift — the "something is about to happen" cue.
  if (lastOfPhrase) {
    play(t0 + beat * 3, beat * 0.3, freq("C6"), { type: "sine", vol: 0.07 });
    play(t0 + beat * 3.35, beat * 0.3, freq("E6"), { type: "sine", vol: 0.075 });
    play(t0 + beat * 3.7, beat * 0.3, freq("G6"), { type: "sine", vol: 0.08 });
  }
}

// Normalise with headroom, then soft-clip so nothing ever crackles.
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
const gain = peak > 0 ? 0.82 / peak : 1;
for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i] * gain);

const buf = Buffer.alloc(44 + N * 2);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 2, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i])) * 32767), 44 + i * 2);
}

const path = join(OUT, "background-music.wav");
writeFileSync(path, buf);
console.log(
  `✓ background-music.wav — ${totalSec.toFixed(1)}s seamless loop at ${BPM} BPM (${(buf.length / 1e6).toFixed(1)} MB)`,
);
