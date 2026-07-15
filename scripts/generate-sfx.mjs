/**
 * Generates every sound effect CRACK THE BOX uses, offline and dependency-free.
 *
 *   npm run sfx    →  public/media/sfx/*.wav
 *
 * The game falls back to Web Audio synthesis if any file is missing, so these
 * are an upgrade rather than a hard requirement.
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
  "sfx",
);
mkdirSync(OUT, { recursive: true });

function wavFile(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
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
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

const seconds = (s) => Math.floor(SR * s);

const decay = (i, n, attack = 0.01) => {
  const a = Math.max(1, seconds(attack));
  if (i < a) return i / a;
  return Math.pow(1 - (i - a) / (n - a), 2);
};

function tone(freq, dur, { type = "sine", vol = 0.5, attack = 0.01 } = {}) {
  const n = seconds(dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const phase = 2 * Math.PI * freq * t;
    let v;
    if (type === "triangle") v = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else if (type === "square") v = Math.sign(Math.sin(phase)) * 0.55;
    else if (type === "saw") v = 2 * (t * freq - Math.floor(0.5 + t * freq));
    else v = Math.sin(phase);
    out[i] = v * vol * decay(i, n, attack);
  }
  return out;
}

/** Noise burst with an exponential tail — the body of impacts and whooshes. */
function noise(dur, { vol = 0.5, power = 2, attack = 0.002 } = {}) {
  const n = seconds(dur);
  const out = new Float32Array(n);
  const a = Math.max(1, seconds(attack));
  for (let i = 0; i < n; i++) {
    const envelope =
      i < a ? i / a : Math.pow(1 - (i - a) / (n - a), power);
    out[i] = (Math.random() * 2 - 1) * vol * envelope;
  }
  return out;
}

/** One-pole low-pass — takes the harshness off white noise. */
function lowpass(data, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = 1 / SR / (rc + 1 / SR);
  const out = new Float32Array(data.length);
  let prev = 0;
  for (let i = 0; i < data.length; i++) {
    prev += alpha * (data[i] - prev);
    out[i] = prev;
  }
  return out;
}

function mix(...layers) {
  const n = Math.max(...layers.map((l) => l.offset + l.data.length));
  const out = new Float32Array(n);
  for (const { data, offset } of layers) {
    for (let i = 0; i < data.length; i++) out[offset + i] += data[i];
  }
  // Soft-clip so stacked layers never crackle.
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 0.9);
  return out;
}
const at = (sec, data) => ({ data, offset: seconds(sec) });

// --- suspense: a rising riser that sits under the 3-2-1 countdown ---------
// Sweeps up in pitch and volume for ~2.6s, then leaves room for the burst.
function suspense() {
  const dur = 2.6;
  const n = seconds(dur);
  const out = new Float32Array(n);
  let phase = 0;
  let phase2 = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    // Exponential sweep 130Hz → 900Hz feels like it is accelerating.
    const freq = 130 * Math.pow(900 / 130, Math.pow(p, 1.6));
    phase += (2 * Math.PI * freq) / SR;
    phase2 += (2 * Math.PI * freq * 1.5) / SR; // a fifth above, thickens it
    const swell = Math.pow(p, 1.4) * 0.5;
    const tremolo = 1 + 0.12 * Math.sin(2 * Math.PI * (4 + 14 * p) * (i / SR));
    out[i] =
      (Math.sin(phase) * 0.7 + Math.sin(phase2) * 0.3) * swell * tremolo;
  }
  // A breath of rising noise on top.
  const air = lowpass(noise(dur, { vol: 0.28, power: 0.5, attack: 1.6 }), 2600);
  return mix(at(0, out), at(0, air));
}

// --- burst: the lid blows off — impact, whoosh and a sparkle tail ---------
function burst() {
  const thump = mix(
    at(0, tone(72, 0.5, { type: "sine", vol: 0.85, attack: 0.002 })),
    at(0, tone(110, 0.32, { type: "triangle", vol: 0.4 })),
  );
  const crack = lowpass(noise(0.28, { vol: 0.85, power: 2.4 }), 5200);
  const whoosh = lowpass(
    noise(0.75, { vol: 0.45, power: 1.2, attack: 0.06 }),
    1900,
  );
  // Sparkle: a scatter of bright bell partials, like glitter falling.
  const sparkles = [];
  for (let k = 0; k < 16; k++) {
    const start = 0.1 + Math.random() * 0.5;
    const freq = 1400 + Math.random() * 2600;
    sparkles.push(
      at(start, tone(freq, 0.3, { type: "sine", vol: 0.14, attack: 0.004 })),
    );
  }
  return mix(at(0, thump), at(0, crack), at(0.02, whoosh), ...sparkles);
}

// --- reveal: the bright "ta-daa" chime under the category card -----------
function reveal() {
  return mix(
    at(0, tone(659.25, 0.5, { type: "triangle", vol: 0.34 })), // E5
    at(0, tone(987.77, 0.5, { type: "sine", vol: 0.2 })), // B5
    at(0.09, tone(1318.51, 0.62, { type: "triangle", vol: 0.32 })), // E6
    at(0.09, tone(1975.53, 0.5, { type: "sine", vol: 0.14 })), // B6
    at(0.3, tone(2637.02, 0.6, { type: "sine", vol: 0.12 })), // E7 shimmer
  );
}

// --- shuffle: soft ticks while scrambled letters fly into place ----------
function shuffle() {
  const layers = [];
  for (let k = 0; k < 10; k++) {
    const t = k * 0.055;
    const f = 900 + Math.random() * 700;
    layers.push(at(t, tone(f, 0.07, { type: "sine", vol: 0.16 })));
    layers.push(
      at(t, lowpass(noise(0.05, { vol: 0.12, power: 3 }), 4200)),
    );
  }
  return mix(...layers);
}

// --- the standard game-show set ------------------------------------------
const click = () => tone(620, 0.05, { type: "square", vol: 0.12 });
const tick = () => tone(880, 0.07, { type: "sine", vol: 0.3 });

const correct = () =>
  mix(
    at(0, tone(523.25, 0.16, { type: "triangle", vol: 0.42 })), // C5
    at(0.1, tone(659.25, 0.16, { type: "triangle", vol: 0.42 })), // E5
    at(0.2, tone(783.99, 0.34, { type: "triangle", vol: 0.48 })), // G5
    at(0.2, tone(1046.5, 0.34, { type: "sine", vol: 0.22 })), // C6
  );

const wrong = () =>
  mix(
    at(0, tone(392, 0.24, { type: "sine", vol: 0.34 })), // G4
    at(0.18, tone(311.13, 0.4, { type: "sine", vol: 0.3 })), // Eb4
    at(0.18, tone(233.08, 0.4, { type: "triangle", vol: 0.16 })), // Bb3
  );

const fanfare = () =>
  mix(
    at(0, tone(523.25, 0.2, { type: "triangle", vol: 0.38 })),
    at(0.14, tone(659.25, 0.2, { type: "triangle", vol: 0.38 })),
    at(0.28, tone(783.99, 0.2, { type: "triangle", vol: 0.38 })),
    at(0.42, tone(1046.5, 0.6, { type: "triangle", vol: 0.48 })),
    at(0.42, tone(1567.98, 0.6, { type: "sine", vol: 0.18 })),
  );

const pop = () =>
  mix(
    at(0, lowpass(noise(0.12, { vol: 0.7, power: 2 }), 6000)),
    at(0, tone(180, 0.1, { type: "triangle", vol: 0.5 })),
  );

const FILES = {
  suspense,
  burst,
  reveal,
  shuffle,
  click,
  tick,
  correct,
  wrong,
  fanfare,
  pop,
};

for (const [name, make] of Object.entries(FILES)) {
  const path = join(OUT, `${name}.wav`);
  writeFileSync(path, wavFile(make()));
  console.log(`✓ ${name}.wav`);
}
console.log(`\nWrote ${Object.keys(FILES).length} sound effects to ${OUT}`);
