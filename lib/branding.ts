/**
 * Partner branding — the single source of truth for the two organisation
 * logos. Nothing else in the app writes a `/branding/...` string.
 *
 * Both files live in `public/branding/` and are loaded LOCALLY: the game runs
 * offline from a static export, so no logo is ever fetched from the network
 * during play.
 *
 * The supplied artwork is used exactly as provided — the header only ever
 * constrains HEIGHT and lets width follow the natural aspect ratio
 * (`object-fit: contain`), so neither logo is stretched, cropped or recoloured.
 * The two are deliberately NOT forced to the same width: the SPE mark is
 * naturally wider and stays proportional.
 */

export interface BrandLogoConfig {
  src: string;
  alt: string;
  /** Intrinsic pixel size — set as width/height attrs to reserve space. */
  width: number;
  height: number;
}

/**
 * The two logos, with the EXACT filenames as supplied. Swapping in new artwork
 * is a one-line change here and nowhere else:
 *
 *   { leftLogo: left.src, leftLogoAlt: left.alt,
 *     rightLogo: right.src, rightLogoAlt: right.alt }
 *
 * `width`/`height` are the file's intrinsic pixel size. They only reserve
 * layout space so the header does not reflow as the images arrive — they never
 * scale the artwork. Update them when a file is replaced.
 */
export const BRANDING: {
  left: BrandLogoConfig;
  right: BrandLogoConfig;
} = {
  left: {
    src: "/branding/renaissance-logo.png",
    alt: "Renaissance",
    width: 391,
    height: 391,
  },
  right: {
    // Supplied as `spe_logo.png` — not `spe-international-logo.png`.
    //
    // KNOWN LIMITATION: this file is a promotional graphic with a dark navy
    // gradient background baked in, not a transparent logo mark, so it reads as
    // a dark rectangle against the light header. Dropping a transparent version
    // into public/branding/ and changing `src` here is the whole fix — the
    // artwork is never recoloured, cropped or masked in code.
    src: "/branding/spe_logo.png",
    alt: "SPE International",
    width: 1536,
    height: 1024,
  },
};
