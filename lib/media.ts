import manifest from "@/data/media-manifest.json";

/**
 * The puzzle artwork the admin can choose from.
 *
 * A static export cannot list `public/` at runtime, so `data/media-manifest.json`
 * IS that list — regenerate it with `npm run media:manifest` after adding a file.
 * It is also what tells the validator which image paths really exist, which is
 * why a question pointing at a deleted file shows up as a problem in the admin
 * rather than as a blank rectangle on the projector.
 */

export interface MediaImage {
  path: string;
  label: string;
  alt: string;
  tags: string[];
}

export const MEDIA_LIBRARY: MediaImage[] = manifest.images as MediaImage[];

/** Paths the validator treats as known-good. Uploads (data URIs) bypass this. */
export const KNOWN_ASSETS: string[] = MEDIA_LIBRARY.map((i) => i.path);

export function findMedia(path: string): MediaImage | undefined {
  return MEDIA_LIBRARY.find((i) => i.path === path);
}

export function isUpload(path: string): boolean {
  return path.startsWith("data:");
}

/** Rough byte size of a data URI's payload, for the storage-quota readout. */
export function dataUriBytes(uri: string): number {
  const comma = uri.indexOf(",");
  if (comma === -1) return uri.length;
  const b64 = uri.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
