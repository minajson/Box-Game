"use client";

import { Callout } from "../ui";
import { ImageBay, type SubEditorProps } from "./shared";

/**
 * Zoom image.
 *
 * The image is mandatory, and this is the one place where a missing asset is not
 * merely untidy: `PuzzleCanvas` reads `puzzle.imageAssets[0]` with no guard
 * (:166), so an empty list renders an `<img>` with no `src` — a blank frame on
 * the projector, with the zoom pips still ticking. The validator marks it
 * `blocksPreview` and `commit()` refuses to activate it.
 */
export default function ZoomEditor(props: SubEditorProps) {
  const hasImage = Boolean(props.draft.imageAssets[0]);

  return (
    <div className="flex flex-col gap-3">
      <ImageBay
        {...props}
        label="Image to zoom into"
        altNote="The image is described to screen readers using the answer, so it needs no separate alt text."
      />

      {!hasImage && (
        <Callout tone="error">
          A zoom question needs an image. Without one the screen is blank.
        </Callout>
      )}

      <Callout>
        The game starts at the tightest crop and zooms out in four steps as the
        facilitator presses <strong>Zoom out</strong>. Pick artwork that is
        unrecognisable close up but obvious once revealed.
      </Callout>
    </div>
  );
}
