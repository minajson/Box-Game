/**
 * Partner branding — the single source of truth for the organisation logos.
 * Nothing else in the app writes a `/branding/...` string.
 *
 * Logo files live in `public/branding/` and are loaded LOCALLY: the game runs
 * offline from a static export, so no logo is ever fetched from the network
 * during play.
 *
 * The supplied artwork is used exactly as provided — the header only ever
 * constrains HEIGHT and lets width follow the natural aspect ratio
 * (`object-fit: contain`), so a logo is never stretched, cropped or recoloured.
 */

export interface BrandLogoConfig {
  src: string;
  alt: string;
  /** Intrinsic pixel size — set as width/height attrs to reserve space. */
  width: number;
  height: number;
}

/**
 * The logos, with the EXACT filenames as supplied. Swapping in new artwork is a
 * one-line change here and nowhere else.
 *
 * `right` is empty: the header simply leaves that slot blank, and the title
 * stays centred either way. Setting it to a config like `left` brings a
 * right-hand logo back.
 *
 * `width`/`height` are the file's intrinsic pixel size. They only reserve
 * layout space so the header does not reflow as the images arrive — they never
 * scale the artwork. Update them when a file is replaced.
 */
export const BRANDING: {
  left: BrandLogoConfig;
  right: BrandLogoConfig | null;
} = {
  left: {
    src: "/branding/renaissance-logo.png",
    alt: "Renaissance",
    width: 391,
    height: 391,
  },
  right: null,
};
