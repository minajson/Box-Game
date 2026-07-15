import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the game is fully client-side and runs offline from `out/`
  // once the media assets are in place.
  output: "export",
  turbopack: { root: __dirname },
  images: { unoptimized: true },
  // The game is projected fullscreen — no dev badge on the big screen.
  devIndicators: false,
};

export default nextConfig;
