"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MASTER_IMAGES } from "@/lib/mascots";
import { sound } from "@/lib/sound";
import type { MascotClip } from "@/lib/types";

/**
 * The approved Renaissance People Day mascot, reacting to the facilitator's
 * call. Reused unchanged from the Pop the Balloon Challenge — same character,
 * face, hair, skin tone, coverall and proportions.
 *
 * Audio & lip-sync contract (per the brief)
 * -----------------------------------------
 * The generated reaction videos are NOT accurately lip-synced, so we do not
 * pretend they are. Instead:
 *
 *   • The ElevenLabs recording is the single source of truth for the voice.
 *   • The video track is ALWAYS muted (`muted`, and re-asserted on every
 *     `play`/`volumechange`) so it can never contribute a second voice — only
 *     one voice track is ever heard.
 *   • The muted video and the recording are started TOGETHER, from t=0, so the
 *     gesture and the words line up as closely as the source allows.
 *   • Attention is kept OFF the mouth: the mascot is shown at a calm
 *     three-quarter scale (object-fit: contain, bottom-anchored) rather than an
 *     extreme mouth close-up, and it reads as a reaction character — smiling,
 *     nodding, gesturing — with the words carried by the audio and the subtitle.
 *
 * The background music ducks while the mascot speaks and is restored the moment
 * the recording ends — not when the mascot leaves.
 *
 * Lifecycle (per the brief): this component NEVER dismisses itself. There is no
 * exit timer, no auto-advance, no fade-out. It renders until its parent
 * unmounts it, which happens only when the facilitator clicks NEXT PUZZLE.
 *
 * Layout: the mascot is laid out in its own column, in normal flow — not as a
 * fixed overlay on top of the content. It therefore cannot cover the revealed
 * answer or the NEXT PUZZLE button, no matter how long it stays on screen.
 */

export default function MascotStage({ clip }: { clip: MascotClip }) {
  const [showVideo, setShowVideo] = useState(Boolean(clip.videoFile));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const duckedRef = useRef(false);

  // Start the muted video and the approved recording together, from the top.
  // Ducking is released when the recording finishes, so the music returns while
  // the mascot is still on screen.
  useEffect(() => {
    const startVideoFromTop = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true; // Never trust the embedded audio.
      try {
        v.currentTime = 0;
      } catch {
        /* not seekable yet — autoplay still starts it at 0 */
      }
      void v.play().catch(() => setShowVideo(false));
    };

    if (!clip.audioFile) {
      startVideoFromTop();
      return;
    }

    const audio = new Audio(clip.audioFile);
    audio.preload = "auto";
    audioRef.current = audio;

    sound.duck();
    duckedRef.current = true;

    const release = () => {
      if (duckedRef.current) {
        sound.unduck();
        duckedRef.current = false;
      }
    };

    audio.onended = release;
    audio.onerror = release;

    // Kick both off in the same tick so gesture and voice align from t=0.
    startVideoFromTop();
    void audio.play().catch(release); // Blocked autoplay must not hold the duck.

    return () => {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      release();
    };
  }, [clip.audioFile, clip.videoFile]);

  return (
    <motion.div
      initial={{ x: 90, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 190, damping: 22 }}
      className="flex h-full flex-col items-center justify-end"
      style={{ width: "clamp(200px, 20vw, 400px)" }}
    >
      <div className="relative flex w-full flex-1 items-end justify-center">
        {showVideo && clip.videoFile ? (
          <video
            key={clip.videoFile}
            ref={videoRef}
            src={clip.videoFile}
            autoPlay
            muted /* the embedded audio is never used */
            loop /* keep the mascot alive for as long as it is on screen */
            playsInline
            controls={false}
            // Belt-and-braces: if anything ever un-mutes the element, re-mute it
            // immediately so a second voice can never slip through.
            onVolumeChange={(e) => {
              const v = e.currentTarget;
              if (!v.muted) v.muted = true;
            }}
            onError={() => setShowVideo(false)}
            className="max-h-full w-full object-contain drop-shadow-2xl"
            style={{ objectPosition: "center bottom" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={MASTER_IMAGES[clip.gender]}
            alt={`Renaissance People Day ${clip.gender} mascot`}
            className="max-h-full w-full object-contain drop-shadow-2xl"
            style={{ objectPosition: "center bottom" }}
          />
        )}
      </div>

      {/* Subtitle — the ElevenLabs line, matched word-for-word to the audio, on
          screen for accessibility and for rooms where the PA is quiet. */}
      <p
        aria-live="polite"
        className={`mt-2 w-full rounded-2xl px-3 py-2 text-center font-bold leading-snug text-white shadow-panel ${
          clip.reaction === "correct" ? "bg-ren-green-deep" : "bg-ink"
        }`}
        style={{ fontSize: "clamp(0.72rem, 1.05vw, 1.05rem)" }}
      >
        “{clip.dialogue}”
      </p>
    </motion.div>
  );
}
