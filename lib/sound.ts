/**
 * Sound for CRACK THE BOX.
 *
 * Two independent layers:
 *
 *  1. Sound effects — decoded once into Web Audio buffers, with a synthesised
 *     fallback so the game still makes noise if a .wav is ever missing.
 *
 *  2. Background music — a SINGLE HTMLAudioElement that lives for the whole
 *     session. It is created lazily on the first user gesture and then never
 *     torn down, so the track keeps playing across the box wall, the opening
 *     sequence, the puzzle, the reveal and the mascot. Nothing in the game
 *     calls `restart`; screens come and go around it.
 *
 * Ducking is reference-counted. The countdown and the mascot voice can both
 * ask for the music to drop, in any order and with overlapping lifetimes, and
 * the music only returns to full volume once the last of them has released.
 */

export type SfxName =
  | "click"
  | "tick"
  | "suspense"
  | "burst"
  | "reveal"
  | "shuffle"
  | "correct"
  | "wrong"
  | "fanfare"
  | "pop";

const SFX_FILES: Record<SfxName, string> = {
  click: "/media/sfx/click.wav",
  tick: "/media/sfx/tick.wav",
  suspense: "/media/sfx/suspense.wav",
  burst: "/media/sfx/burst.wav",
  reveal: "/media/sfx/reveal.wav",
  shuffle: "/media/sfx/shuffle.wav",
  correct: "/media/sfx/correct.wav",
  wrong: "/media/sfx/wrong.wav",
  fanfare: "/media/sfx/fanfare.wav",
  pop: "/media/sfx/pop.wav",
};

/** Per-effect trim so nothing shouts over the mascot. */
const SFX_GAIN: Record<SfxName, number> = {
  click: 0.35,
  tick: 0.5,
  suspense: 0.7,
  burst: 0.9,
  reveal: 0.8,
  shuffle: 0.6,
  correct: 0.85,
  wrong: 0.8,
  fanfare: 0.85,
  pop: 0.7,
};

/**
 * The looping bed. Only files that actually ship are listed — probing for an
 * optional MP3 would log a 404 on every single load, which is exactly the kind
 * of noise you do not want when you are debugging on the morning of the event.
 *
 * To use a licensed track instead, drop it in as background-music.wav (or add
 * its path to the FRONT of this list).
 */
const MUSIC_SOURCES = ["/media/audio/background-music.wav"];

const DUCK_FACTOR = 0.28;

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SfxName, AudioBuffer>();
  private missing = new Set<SfxName>();
  /** Live sources, so `stopAll` can cut a long riser short (e.g. on skip). */
  private playing = new Set<AudioBufferSourceNode>();

  sfxEnabled = true;

  private music: HTMLAudioElement | null = null;
  private musicEnabled = true;
  private baseVolume = 0.12;
  private duckCount = 0;
  private fadeTimer: number | null = null;

  // ---- Web Audio plumbing ------------------------------------------------

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Warm the audio context and decode every effect. Call on first gesture. */
  preload(): void {
    if (!this.ensureCtx()) return;
    (Object.keys(SFX_FILES) as SfxName[]).forEach((n) => void this.buffer(n));
  }

  private async buffer(name: SfxName): Promise<AudioBuffer | null> {
    const ctx = this.ensureCtx();
    if (!ctx) return null;
    const cached = this.buffers.get(name);
    if (cached) return cached;
    if (this.missing.has(name)) return null;
    try {
      const res = await fetch(SFX_FILES[name]);
      if (!res.ok) throw new Error(`${res.status}`);
      const decoded = await ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(name, decoded);
      return decoded;
    } catch {
      this.missing.add(name);
      return null;
    }
  }

  async play(name: SfxName): Promise<void> {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const buf = await this.buffer(name);
    if (!buf) {
      this.synth(name, ctx);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = SFX_GAIN[name];
    src.connect(gain).connect(ctx.destination);
    src.onended = () => this.playing.delete(src);
    this.playing.add(src);
    src.start();
  }

  /** Cut every in-flight effect — used when the facilitator skips mid-suspense. */
  stopAll(): void {
    this.playing.forEach((src) => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    });
    this.playing.clear();
  }

  // ---- Background music --------------------------------------------------

  configureMusic(enabled: boolean, volume: number): void {
    this.musicEnabled = enabled;
    this.baseVolume = volume;
    if (!enabled) {
      this.music?.pause();
      return;
    }
    if (this.music) {
      this.music.volume = this.targetVolume();
      // Re-enabling mid-game resumes the same element at its current position.
      if (this.music.paused) void this.music.play().catch(() => {});
    }
  }

  /**
   * Start the loop, or do nothing if it is already running. Deliberately
   * idempotent: every screen may call this, and none of them restart the track.
   */
  startMusic(): void {
    if (!this.musicEnabled || typeof window === "undefined") return;
    if (!this.music) {
      const el = new Audio();
      el.loop = true;
      el.preload = "auto";
      el.volume = this.targetVolume();
      let i = 0;
      el.src = MUSIC_SOURCES[i];
      el.addEventListener("error", () => {
        i += 1;
        if (i < MUSIC_SOURCES.length) {
          el.src = MUSIC_SOURCES[i];
          if (this.musicEnabled) void el.play().catch(() => {});
        } else {
          this.music = null; // No track available — stay silent, never crash.
        }
      });
      this.music = el;
    }
    if (!this.music.paused) return; // Already playing — leave it exactly alone.
    this.music.volume = this.targetVolume();
    void this.music.play().catch(() => {
      /* Autoplay still blocked; the next user gesture retries. */
    });
  }

  private targetVolume(): number {
    return this.duckCount > 0
      ? this.baseVolume * DUCK_FACTOR
      : this.baseVolume;
  }

  /** Lower the music. Every duck() must be paired with an unduck(). */
  duck(): void {
    this.duckCount += 1;
    if (this.duckCount === 1) this.fadeTo(this.targetVolume(), 160);
  }

  unduck(): void {
    this.duckCount = Math.max(0, this.duckCount - 1);
    if (this.duckCount === 0) this.fadeTo(this.targetVolume(), 600);
  }

  /** Belt-and-braces: drop every outstanding duck (used when a screen resets). */
  clearDucking(): void {
    this.duckCount = 0;
    this.fadeTo(this.targetVolume(), 400);
  }

  private fadeTo(target: number, ms: number): void {
    const el = this.music;
    if (!el) return;
    if (this.fadeTimer) window.clearInterval(this.fadeTimer);
    const steps = Math.max(1, Math.round(ms / 40));
    const from = el.volume;
    const delta = (target - from) / steps;
    let i = 0;
    this.fadeTimer = window.setInterval(() => {
      i += 1;
      el.volume = Math.max(0, Math.min(1, from + delta * i));
      if (i >= steps && this.fadeTimer) {
        window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }, 40);
  }

  // ---- Fallback synthesis ------------------------------------------------

  private synth(name: SfxName, ctx: AudioContext): void {
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(ctx.destination);

    const tone = (
      f: number,
      start: number,
      dur: number,
      type: OscillatorType = "sine",
      vol = 0.4,
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0 + start);
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(vol, t0 + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + start + dur);
      osc.connect(g).connect(out);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.05);
    };

    const noise = (start: number, dur: number, vol = 0.5) => {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(g).connect(out);
      src.start(t0 + start);
    };

    switch (name) {
      case "suspense": {
        // Rising sweep — the same gesture as the generated riser.
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, t0);
        osc.frequency.exponentialRampToValueAtTime(900, t0 + 2.6);
        g.gain.setValueAtTime(0.02, t0);
        g.gain.linearRampToValueAtTime(0.3, t0 + 2.4);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.7);
        osc.connect(g).connect(out);
        osc.start(t0);
        osc.stop(t0 + 2.8);
        break;
      }
      case "burst":
        noise(0, 0.3, 0.8);
        tone(72, 0, 0.45, "sine", 0.7);
        tone(1600, 0.1, 0.3, "sine", 0.12);
        break;
      case "reveal":
        tone(659.25, 0, 0.5, "triangle", 0.3);
        tone(1318.51, 0.09, 0.6, "triangle", 0.28);
        tone(1975.53, 0.3, 0.5, "sine", 0.12);
        break;
      case "shuffle":
        for (let i = 0; i < 8; i++) tone(900 + i * 60, i * 0.055, 0.07, "sine", 0.14);
        break;
      case "correct":
        tone(523.25, 0, 0.16, "triangle", 0.4);
        tone(659.25, 0.1, 0.16, "triangle", 0.4);
        tone(783.99, 0.2, 0.34, "triangle", 0.45);
        break;
      case "wrong":
        tone(392, 0, 0.24, "sine", 0.32);
        tone(311.13, 0.18, 0.4, "sine", 0.28);
        break;
      case "fanfare":
        tone(523.25, 0, 0.2, "triangle", 0.36);
        tone(659.25, 0.14, 0.2, "triangle", 0.36);
        tone(783.99, 0.28, 0.2, "triangle", 0.36);
        tone(1046.5, 0.42, 0.6, "triangle", 0.45);
        break;
      case "pop":
        noise(0, 0.12, 0.65);
        tone(180, 0, 0.1, "triangle", 0.45);
        break;
      case "tick":
        tone(880, 0, 0.07, "sine", 0.28);
        break;
      case "click":
        tone(620, 0, 0.05, "square", 0.12);
        break;
    }
  }
}

/** Module singleton — one manager, one music element, for the whole session. */
export const sound = new SoundManager();
