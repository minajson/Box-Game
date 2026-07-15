import manifest from "@/data/mascot-manifest.json";
import type { MascotClip, MascotGender, MascotReaction } from "./types";

/**
 * The approved Renaissance People Day mascots, reused unchanged from the
 * Pop the Balloon Challenge. Same characters, same coveralls, same voices.
 *
 * The ElevenLabs recordings in /media/audio are the source of truth for what
 * the mascot says. The MP4s are played MUTED and the recording is played
 * alongside them, so the game never depends on the audio embedded in the
 * video — see components/MascotStage.tsx.
 */

const CLIPS = manifest as MascotClip[];

export const MASTER_IMAGES: Record<MascotGender, string> = {
  male: "/media/images/RENAISSANCE_MALE_MASCOT_MASTER.png",
  female: "/media/images/RENAISSANCE_FEMALE_MASCOT_MASTER.png",
};

export function clipsFor(
  gender: MascotGender,
  reaction: MascotReaction,
): MascotClip[] {
  return CLIPS.filter((c) => c.gender === gender && c.reaction === reaction);
}

/**
 * Pick a clip, rotating through the variants so the same gesture does not
 * replay back to back. Falls back to the other mascot if a gender is missing
 * its clip entirely, and finally to a still of the master image.
 */
export function pickClip(
  gender: MascotGender,
  reaction: MascotReaction,
  variantSeed: number,
): MascotClip {
  const own = clipsFor(gender, reaction);
  if (own.length > 0) return own[Math.abs(variantSeed) % own.length];

  const other = clipsFor(otherGender(gender), reaction);
  if (other.length > 0) return other[Math.abs(variantSeed) % other.length];

  return {
    gender,
    reaction,
    videoFile: null,
    audioFile: null,
    dialogue:
      reaction === "correct"
        ? "Good job! Well done!"
        : "Oh-oh! Please try again next time!",
    durationSec: null,
  };
}

export function otherGender(g: MascotGender): MascotGender {
  return g === "male" ? "female" : "male";
}

/** Every video the game may need — warmed up once the game starts. */
export function preloadTargets(): string[] {
  return CLIPS.map((c) => c.videoFile).filter((f): f is string => Boolean(f));
}
