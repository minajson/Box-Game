"use client";

import { useRef, useState } from "react";

import { needsScene, optionLetter, sceneSrc } from "@/lib/clickable";
import { estimateBankBytes } from "@/lib/download";
import { findMedia } from "@/lib/media";
import { newUid } from "@/lib/puzzleStore";
import { removeAsset } from "@/lib/puzzleValidation";
import {
  HOTSPOT_LABEL_SIDES,
  type ClickInteraction,
  type ClickOption,
  type Hotspot,
  type HotspotArea,
  type HotspotLabelSide,
  type ManagedPuzzle,
} from "@/lib/types";

import MediaPicker from "../MediaPicker";
import {
  Btn,
  Callout,
  Field,
  IconBtn,
  InlineSelect,
  Segmented,
  TextArea,
  TextInput,
  Toggle,
} from "../ui";
import { IssueList, issueFor, issuesUnder, type SubEditorProps } from "./shared";

/**
 * Clickable challenge — answered by the facilitator clicking, not out loud.
 *
 * Three interactions share one editor because they share most of their data:
 *
 *   choice    answer cards, one or more ticked Correct. Optional scene photo,
 *             optionally zoomed in three stages before the cards appear.
 *   sequence  the same cards, listed here in the RIGHT order; the game shuffles.
 *   hotspot   areas drawn on the scene photo. The room must click inside them.
 *
 * Images follow the existing convention: everything lives in `imageAssets`, and
 * cards and the scene point into it by index, so removing an image re-points
 * every reference (lib/puzzleValidation.ts → removeAsset).
 */

const INTERACTIONS: { value: ClickInteraction; label: string }[] = [
  { value: "choice", label: "Answer cards" },
  { value: "hotspot", label: "Click the photo" },
  { value: "sequence", label: "Put in order" },
];

const shortId = (prefix: string) => `${prefix}-${newUid().slice(0, 8)}`;

function blankOption(): ClickOption {
  return { id: shortId("o"), label: "" };
}

/** The payload to start a fresh interaction from. */
export function seedInteraction(kind: ClickInteraction): Partial<ManagedPuzzle> {
  if (kind === "hotspot") {
    return {
      interaction: kind,
      options: undefined,
      sceneZoom: undefined,
      sceneFocus: undefined,
      selectCount: undefined,
      hotspots: [{ id: shortId("h"), label: "", areas: [] }],
    };
  }
  return {
    interaction: kind,
    hotspots: undefined,
    selectCount: undefined,
    sceneZoom: undefined,
    sceneFocus: undefined,
    options: [0, 1, 2, 3].map((i) => ({ ...blankOption(), ...(kind === "choice" && i === 0 ? { correct: true } : {}) })),
  };
}

/** Put a path into imageAssets (reusing an existing entry) and return its index. */
function addAsset(assets: string[], path: string): { assets: string[]; index: number } {
  const at = assets.indexOf(path);
  if (at !== -1) return { assets, index: at };
  return { assets: [...assets, path], index: assets.length };
}

export default function ClickableEditor({ draft, issues, onChange }: SubEditorProps) {
  const interaction = draft.interaction ?? "choice";
  const [picking, setPicking] = useState<"scene" | number | null>(null);

  const scene = sceneSrc(draft);
  const sceneRequired = needsScene(draft);

  const setScene = (path: string) => {
    if (draft.sceneAsset !== undefined && draft.imageAssets[draft.sceneAsset] !== undefined) {
      const assets = [...draft.imageAssets];
      assets[draft.sceneAsset] = path;
      onChange({ imageAssets: assets });
      return;
    }
    const { assets, index } = addAsset(draft.imageAssets, path);
    onChange({ imageAssets: assets, sceneAsset: index });
  };

  const removeScene = () => {
    const index = draft.sceneAsset ?? (sceneRequired ? 0 : undefined);
    if (index === undefined || draft.imageAssets[index] === undefined) return;
    onChange(removeAsset(draft, index));
  };

  const options = draft.options ?? [];
  const writeOptions = (next: ClickOption[]) => onChange({ options: next });
  const setOption = (i: number, patch: Partial<ClickOption>) =>
    writeOptions(options.map((o, n) => (n === i ? { ...o, ...patch } : o)));
  const moveOption = (i: number, delta: number) => {
    const to = i + delta;
    if (to < 0 || to >= options.length) return;
    const next = [...options];
    [next[i], next[to]] = [next[to], next[i]];
    writeOptions(next);
  };
  const setOptionImage = (i: number, path: string) => {
    const { assets, index } = addAsset(draft.imageAssets, path);
    onChange({
      imageAssets: assets,
      options: options.map((o, n) => (n === i ? { ...o, assetIndex: index } : o)),
    });
  };
  const clearOptionImage = (i: number) =>
    writeOptions(
      options.map((o, n) => {
        if (n !== i) return o;
        // Delete rather than set undefined: JSON.stringify drops undefined, so
        // the two would behave differently after a reload.
        const rest = { ...o };
        delete rest.assetIndex;
        return rest;
      }),
    );

  const pickedPath =
    picking === "scene"
      ? scene
      : typeof picking === "number" && options[picking]?.assetIndex !== undefined
        ? draft.imageAssets[options[picking].assetIndex!]
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
          How the room answers
        </p>
        <Segmented
          label="Interaction"
          value={interaction}
          options={INTERACTIONS}
          onChange={(v) => {
            if (v !== interaction) onChange(seedInteraction(v as ClickInteraction));
          }}
        />
        {issueFor(issues, "interaction") && (
          <Callout tone="error">{issueFor(issues, "interaction")}</Callout>
        )}
      </div>

      <Field
        label="Scenario (optional)"
        hint="A line of context shown above the challenge, e.g. the situation to judge."
      >
        {(props) => (
          <TextArea
            {...props}
            value={draft.scenario ?? ""}
            onChange={(e) => onChange({ scenario: e.target.value || undefined })}
            placeholder="You find an unfamiliar access badge near a restricted facility."
          />
        )}
      </Field>

      {/* -------------------------------------------------------- scene -- */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
          Scene photo {sceneRequired ? "(required)" : "(optional)"}
        </p>
        {scene ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/12 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scene} alt="" className="h-16 w-28 shrink-0 rounded-lg border border-ink/10 object-cover" />
            <p className="min-w-0 flex-1 truncate text-xs font-bold text-ink">
              {findMedia(scene)?.label ?? scene}
            </p>
            <Btn size="sm" onClick={() => setPicking("scene")}>
              Replace
            </Btn>
            <IconBtn tone="danger" label="Remove scene photo" onClick={removeScene}>
              ×
            </IconBtn>
          </div>
        ) : (
          <Btn onClick={() => setPicking("scene")}>Choose a scene photo…</Btn>
        )}
        <IssueList issues={[...issuesUnder(issues, "sceneAsset"), ...issuesUnder(issues, "imageAssets")]} />
      </div>

      {interaction === "choice" && (
        <div className="flex flex-col gap-2 rounded-xl border border-ink/10 bg-ink/[0.02] p-3">
          <Toggle
            label="Zoom into the scene first"
            hint="The photo starts as an extreme close-up. The cards appear after the third Zoom Out."
            checked={draft.sceneZoom === true}
            onChange={(v) => onChange({ sceneZoom: v || undefined, ...(v ? {} : { sceneFocus: undefined }) })}
          />
          {draft.sceneZoom && (
            <div className="flex flex-wrap gap-3">
              {(["x", "y"] as const).map((axis) => (
                <Field
                  key={axis}
                  label={axis === "x" ? "Zoom point across (%)" : "Zoom point down (%)"}
                  error={issueFor(issues, "sceneFocus")}
                  className="w-44"
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      type="number"
                      min={0}
                      max={100}
                      value={draft.sceneFocus?.[axis] ?? 50}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        onChange({ sceneFocus: { x: 50, y: 50, ...draft.sceneFocus, [axis]: n } });
                      }}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------ hotspots -- */}
      {interaction === "hotspot" ? (
        <HotspotEditor draft={draft} issues={issues} onChange={onChange} scene={scene} />
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
            {interaction === "sequence" ? "Cards, in the correct order" : "Answer cards"}
          </p>
          {options.map((option, i) => {
            const photo =
              option.assetIndex !== undefined ? draft.imageAssets[option.assetIndex] : undefined;
            const correct = interaction === "choice" && option.correct === true;
            return (
              <div
                key={option.id}
                className={`rounded-xl border p-3 ${
                  correct ? "border-ren-green bg-ren-green-soft ring-2 ring-ren-green/25" : "border-ink/12 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-end gap-2.5">
                  <span className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-sm font-black text-ink">
                    {interaction === "sequence" ? i + 1 : optionLetter(i)}
                  </span>
                  <Field
                    label="Card label"
                    required
                    error={issueFor(issues, `options.${i}.label`)}
                    className="min-w-[12rem] flex-1"
                  >
                    {(props) => (
                      <TextInput
                        {...props}
                        value={option.label}
                        onChange={(e) => setOption(i, { label: e.target.value })}
                        placeholder="Verify identity"
                      />
                    )}
                  </Field>
                  <Field label="Detail (optional)" className="min-w-[10rem] flex-1">
                    {(props) => (
                      <TextInput
                        {...props}
                        value={option.detail ?? ""}
                        onChange={(e) => setOption(i, { detail: e.target.value || undefined })}
                        placeholder="Smaller line under the label"
                      />
                    )}
                  </Field>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {interaction === "choice" && (
                    <Btn
                      size="sm"
                      onClick={() => setOption(i, { correct: correct ? undefined : true })}
                    >
                      {correct ? "✓ Correct" : "Mark correct"}
                    </Btn>
                  )}
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="" className="h-9 w-9 rounded-lg border border-ink/12 object-cover" />
                      <IconBtn tone="danger" label={`Remove photo from card ${i + 1}`} onClick={() => clearOptionImage(i)}>
                        ×
                      </IconBtn>
                    </>
                  ) : (
                    <Btn size="sm" onClick={() => setPicking(i)}>
                      Photo…
                    </Btn>
                  )}
                  <span className="ml-auto flex gap-1">
                    <IconBtn label={`Move card ${i + 1} up`} onClick={() => moveOption(i, -1)} disabled={i === 0}>
                      ↑
                    </IconBtn>
                    <IconBtn label={`Move card ${i + 1} down`} onClick={() => moveOption(i, 1)} disabled={i === options.length - 1}>
                      ↓
                    </IconBtn>
                    <IconBtn
                      tone="danger"
                      label={`Delete card ${i + 1}`}
                      onClick={() => writeOptions(options.filter((_, n) => n !== i))}
                      disabled={options.length <= 2}
                    >
                      ×
                    </IconBtn>
                  </span>
                </div>
              </div>
            );
          })}
          <div>
            <Btn size="sm" onClick={() => writeOptions([...options, blankOption()])} disabled={options.length >= 6}>
              + Add card
            </Btn>
          </div>
          <IssueList issues={issues.filter((i) => i.field === "options" || i.field.endsWith(".id"))} />

          {interaction === "choice" && (
            <PickCount draft={draft} issues={issues} onChange={onChange} max={Math.max(1, options.length)} fallback={1} />
          )}
        </div>
      )}

      <Callout>
        {interaction === "hotspot"
          ? "The facilitator clicks the photo where the room points. Each click drops a numbered marker; the answer is right when every marker lands on a different area."
          : interaction === "sequence"
            ? "List the cards in the right order here. The game shows them shuffled; the room taps them 1, 2, 3… and the cards travel into place after Submit."
            : "Cards with photos sit in a row; text cards sit beside the scene photo. Nothing shows which card is correct until the facilitator presses Submit."}{" "}
        The explanation below is shown large after submitting.
      </Callout>

      <MediaPicker
        open={picking !== null}
        value={pickedPath}
        bankBytes={estimateBankBytes([draft])}
        onPick={(path) => {
          if (picking === "scene") setScene(path);
          else if (typeof picking === "number") setOptionImage(picking, path);
        }}
        onClose={() => setPicking(null)}
      />
    </div>
  );
}

/** How many picks complete an answer. Blank means the default. */
function PickCount({
  draft,
  issues,
  onChange,
  max,
  fallback,
}: SubEditorProps & { max: number; fallback: number }) {
  return (
    <Field
      label="Picks needed"
      error={issueFor(issues, "selectCount")}
      hint={`Submit unlocks after this many picks. Default ${fallback}.`}
      className="w-48"
    >
      {(props) => (
        <TextInput
          {...props}
          type="number"
          min={1}
          max={max}
          value={draft.selectCount ?? fallback}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (Number.isFinite(n)) onChange({ selectCount: n === fallback ? undefined : n });
          }}
        />
      )}
    </Field>
  );
}

/* --------------------------------------------------------------- hotspots -- */

const HOTSPOT_COLOURS = ["#2563eb", "#db2777", "#d97706", "#7c3aed", "#0891b2", "#65a30d"];

/**
 * Hotspot areas, drawn by dragging on the photo. Each hotspot can have several
 * areas (e.g. a fake link that appears as a button AND in the status bar).
 */
function HotspotEditor({
  draft,
  issues,
  onChange,
  scene,
}: SubEditorProps & { scene?: string }) {
  const spots: Hotspot[] = draft.hotspots ?? [];
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState<HotspotArea | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const write = (next: Hotspot[]) => onChange({ hotspots: next });
  const setSpot = (i: number, patch: Partial<Hotspot>) =>
    write(spots.map((h, n) => (n === i ? { ...h, ...patch } : h)));

  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    return {
      x: clamp(((e.clientX - box.left) / box.width) * 100),
      y: clamp(((e.clientY - box.top) / box.height) * 100),
    };
  };
  const round = (v: number) => Math.round(v * 10) / 10;
  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): HotspotArea => ({
    x: round(Math.min(a.x, b.x)),
    y: round(Math.min(a.y, b.y)),
    w: round(Math.abs(a.x - b.x)),
    h: round(Math.abs(a.y - b.y)),
  });

  return (
    <div className="flex flex-col gap-3">
      {scene ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">
            Choose a hotspot below, then drag on the photo to draw an area for it.
          </p>
          <div
            className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-ink/12"
            onPointerDown={(e) => {
              if (!spots[active]) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = at(e);
              setDrag({ ...start.current, w: 0, h: 0 });
            }}
            onPointerMove={(e) => {
              if (start.current) setDrag(rectFrom(start.current, at(e)));
            }}
            onPointerUp={(e) => {
              if (!start.current) return;
              const area = rectFrom(start.current, at(e));
              start.current = null;
              setDrag(null);
              // Ignore a click without a drag.
              if (area.w < 1 || area.h < 1) return;
              setSpot(active, { areas: [...(spots[active].areas ?? []), area] });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scene} alt="" draggable={false} className="block w-full" />
            {spots.flatMap((h, i) =>
              (h.areas ?? []).map((a, j) => (
                <span
                  key={`${h.id}-${j}`}
                  className="pointer-events-none absolute rounded border-2"
                  style={{
                    left: `${a.x}%`,
                    top: `${a.y}%`,
                    width: `${a.w}%`,
                    height: `${a.h}%`,
                    borderColor: HOTSPOT_COLOURS[i % HOTSPOT_COLOURS.length],
                    background: `${HOTSPOT_COLOURS[i % HOTSPOT_COLOURS.length]}${i === active ? "33" : "14"}`,
                  }}
                />
              )),
            )}
            {drag && (
              <span
                className="pointer-events-none absolute rounded border-2 border-dashed border-ink bg-white/20"
                style={{ left: `${drag.x}%`, top: `${drag.y}%`, width: `${drag.w}%`, height: `${drag.h}%` }}
              />
            )}
          </div>
        </div>
      ) : (
        <Callout tone="warn">Choose the scene photo first — the areas are drawn on it.</Callout>
      )}

      {spots.map((h, i) => (
        <div
          key={h.id}
          className={`rounded-xl border p-3 ${i === active ? "border-ink/40 bg-white ring-2 ring-ink/10" : "border-ink/12 bg-white"}`}
        >
          <div className="flex flex-wrap items-end gap-2.5">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className="mb-1 flex h-9 shrink-0 items-center gap-2 rounded-lg border border-ink/15 px-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-ink"
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: HOTSPOT_COLOURS[i % HOTSPOT_COLOURS.length] }} />
              {i === active ? "Drawing" : "Draw"}
            </button>
            <Field
              label={`Hotspot ${i + 1} label`}
              required
              error={issueFor(issues, `hotspots.${i}.label`)}
              hint="Shown on the photo after submitting."
              className="min-w-[12rem] flex-1"
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={h.label}
                  onChange={(e) => setSpot(i, { label: e.target.value })}
                  placeholder="Unattended badge"
                />
              )}
            </Field>
            <div className="mb-1">
              <InlineSelect
                label="Label position"
                value={h.labelSide ?? ""}
                onChange={(v) => setSpot(i, { labelSide: (v || undefined) as HotspotLabelSide | undefined })}
              >
                <option value="">Auto</option>
                {HOTSPOT_LABEL_SIDES.map((side) => (
                  <option key={side} value={side}>
                    {side[0].toUpperCase() + side.slice(1)}
                  </option>
                ))}
              </InlineSelect>
            </div>
            <IconBtn
              tone="danger"
              label={`Delete hotspot ${i + 1}`}
              disabled={spots.length <= 1}
              onClick={() => {
                write(spots.filter((_, n) => n !== i));
                setActive(0);
              }}
            >
              ×
            </IconBtn>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(h.areas ?? []).map((a, j) => {
              const labelled = j === (h.labelArea ?? 0);
              return (
                <span key={j} className="flex items-center gap-1 rounded-full bg-ink/[0.06] py-0.5 pl-2.5 pr-1 text-[11px] font-bold text-ink-soft">
                  {a.x}%, {a.y}% · {a.w}×{a.h}
                  <button
                    type="button"
                    onClick={() => setSpot(i, { labelArea: j === 0 ? undefined : j })}
                    aria-pressed={labelled}
                    title="Show this hotspot's label on this area after submitting"
                    className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${labelled ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/10"}`}
                  >
                    {labelled ? "Label" : "Label here"}
                  </button>
                  <IconBtn
                    size="sm"
                    tone="danger"
                    label={`Remove area ${j + 1} of hotspot ${i + 1}`}
                    onClick={() =>
                      setSpot(i, {
                        areas: h.areas.filter((_, n) => n !== j),
                        // Keep the label on the same area, or fall back to the first.
                        labelArea:
                          h.labelArea === undefined || h.labelArea === j
                            ? undefined
                            : h.labelArea > j
                              ? h.labelArea - 1 || undefined
                              : h.labelArea,
                      })
                    }
                  >
                    ×
                  </IconBtn>
                </span>
              );
            })}
            {(h.areas ?? []).length === 0 && (
              <span className="text-[11px] font-semibold text-amber-700">No area yet — drag on the photo.</span>
            )}
          </div>
        </div>
      ))}

      <div>
        <Btn
          size="sm"
          onClick={() => {
            write([...spots, { id: shortId("h"), label: "", areas: [] }]);
            setActive(spots.length);
          }}
          disabled={spots.length >= 6}
        >
          + Add hotspot
        </Btn>
      </div>
      <IssueList issues={issuesUnder(issues, "hotspots").filter((i) => !i.field.endsWith(".label"))} />

      <PickCount
        draft={draft}
        issues={issues}
        onChange={onChange}
        max={Math.max(1, spots.length)}
        fallback={Math.max(1, spots.length)}
      />
    </div>
  );
}
