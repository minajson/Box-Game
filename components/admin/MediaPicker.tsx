"use client";

import { useMemo, useRef, useState } from "react";

import { MEDIA_LIBRARY, dataUriBytes, formatBytes, isUpload } from "@/lib/media";
import { readFileAsDataUri } from "@/lib/download";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Btn, Callout, Field, Segmented, TextInput } from "./ui";

/**
 * Choose an image for a question.
 *
 * WHY THE LIBRARY IS THE PRIMARY PATH AND UPLOAD IS NOT
 * ----------------------------------------------------
 * There is no backend, so an "upload" can only mean a base64 data URI inside the
 * question itself, in localStorage. That costs real money on a ~5 MiB origin
 * quota shared with the game's own saved session: base64 inflates a file by a
 * third, and `loadBank()` re-parses the whole payload on every mount AND every
 * cross-tab storage event. A few photos and the admin meets `saveBank`'s quota
 * error ten minutes before a session.
 *
 * Files in `public/media/puzzles/` have none of those problems: they are version
 * controlled, they survive a cleared browser profile, and they travel with the
 * offline `out/` build. So the library is the default and upload is the clearly
 * labelled fallback, capped hard.
 */

const MAX_UPLOAD_BYTES = 150 * 1024;
const WARN_BANK_BYTES = 3 * 1024 * 1024;
const DANGER_BANK_BYTES = 4 * 1024 * 1024;

type Tab = "library" | "path" | "upload";

export default function MediaPicker({
  open,
  value,
  bankBytes,
  onPick,
  onClose,
}: {
  open: boolean;
  /** The currently chosen path, so it can be shown as selected. */
  value?: string;
  bankBytes: number;
  onPick: (path: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, onClose);

  const [tab, setTab] = useState<Tab>("library");
  const [search, setSearch] = useState("");
  const [pathDraft, setPathDraft] = useState("");
  const [probe, setProbe] = useState<"idle" | "checking" | "found" | "missing">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MEDIA_LIBRARY;
    return MEDIA_LIBRARY.filter((img) =>
      [img.label, img.alt, img.path, ...img.tags].join(" ").toLowerCase().includes(q),
    );
  }, [search]);

  if (!open) return null;

  const checkPath = () => {
    const path = pathDraft.trim();
    if (!path) return;
    setProbe("checking");
    // There is no filesystem API in the browser, so actually loading the image is
    // the only way to know whether the path resolves in this build.
    const img = new Image();
    img.onload = () => setProbe("found");
    img.onerror = () => setProbe("missing");
    img.src = path;
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        `That file is ${formatBytes(file.size)}. Use one under ${formatBytes(
          MAX_UPLOAD_BYTES,
        )}, or put it in public/media/puzzles/ and run npm run media:manifest instead.`,
      );
      return;
    }
    try {
      const uri = await readFileAsDataUri(file);
      onPick(uri);
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not read that image.");
    }
  };

  const quotaTone =
    bankBytes > DANGER_BANK_BYTES ? "error" : bankBytes > WARN_BANK_BYTES ? "warn" : "info";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Choose an image"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-[min(44rem,100%)] flex-col rounded-2xl border border-ink/10 bg-white shadow-lift"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-5 py-3.5">
          <h2 className="text-base font-black text-ink">Choose an image</h2>
          <Btn size="sm" data-autofocus onClick={onClose}>
            Close
          </Btn>
        </div>

        <div className="border-b border-ink/8 px-5 py-3">
          <Segmented
            label="Image source"
            value={tab}
            options={[
              { value: "library", label: `Library (${MEDIA_LIBRARY.length})` },
              { value: "path", label: "By path" },
              { value: "upload", label: "Upload" },
            ]}
            onChange={setTab}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* ------------------------------------------------------- library */}
          {tab === "library" && (
            <>
              <Field label="Search the library" className="mb-3">
                {(props) => (
                  <TextInput
                    {...props}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="growth, teamwork, key…"
                  />
                )}
              </Field>

              {results.length === 0 ? (
                <Callout tone="warn">
                  Nothing matches “{search.trim()}”. Clear the search, or add the
                  file to <code>public/media/puzzles/</code> and run{" "}
                  <code>npm run media:manifest</code>.
                </Callout>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Available images"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                >
                  {results.map((img) => {
                    const selected = value === img.path;
                    return (
                      <button
                        key={img.path}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          onPick(img.path);
                          onClose();
                        }}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-2.5 text-center transition ${
                          selected
                            ? "border-ren-green bg-ren-green-soft ring-4 ring-ren-green/25"
                            : "border-ink/12 bg-white hover:border-ink/25 hover:bg-ink/[0.02]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.path}
                          alt={img.alt || img.label}
                          className="h-24 w-full object-contain"
                        />
                        <span className="text-xs font-bold text-ink">{img.label}</span>
                        {!img.alt && (
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700">
                            no alt text
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
                This list comes from <code>data/media-manifest.json</code>. Drop a
                file into <code>public/media/puzzles/</code> and run{" "}
                <code>npm run media:manifest</code> to add it.
              </p>
            </>
          )}

          {/* ---------------------------------------------------------- path */}
          {tab === "path" && (
            <div className="flex flex-col gap-3">
              <Field
                label="Image path"
                hint="A file inside public/, written from the site root — for example /media/puzzles/zoom-key.svg"
              >
                {(props) => (
                  <TextInput
                    {...props}
                    value={pathDraft}
                    onChange={(e) => {
                      setPathDraft(e.target.value);
                      setProbe("idle");
                    }}
                    placeholder="/media/puzzles/my-image.png"
                  />
                )}
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <Btn size="sm" onClick={checkPath} disabled={!pathDraft.trim()}>
                  Check it loads
                </Btn>
                {probe === "checking" && (
                  <span className="text-xs font-bold text-ink-soft">Checking…</span>
                )}
                {probe === "found" && (
                  <span className="text-xs font-bold text-ren-green-deep">
                    Found — this path works.
                  </span>
                )}
                {probe === "missing" && (
                  <span className="text-xs font-bold text-red-700">
                    Nothing loads at that path in this build.
                  </span>
                )}
              </div>

              {probe === "found" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pathDraft.trim()}
                  alt=""
                  className="h-32 w-full rounded-xl border border-ink/12 object-contain"
                />
              )}

              <Btn
                tone="primary"
                disabled={!pathDraft.trim()}
                onClick={() => {
                  onPick(pathDraft.trim());
                  onClose();
                }}
              >
                Use this path
              </Btn>
            </div>
          )}

          {/* -------------------------------------------------------- upload */}
          {tab === "upload" && (
            <div className="flex flex-col gap-3">
              <Callout tone="warn" title="Uploads are stored in this browser only">
                An uploaded image is embedded in the question itself, in this
                browser’s storage. It will <strong>not</strong> appear on another
                machine unless you export your questions, and large images can
                fill the storage quota and stop questions saving at all.
                <br />
                <br />
                For anything you will reuse, put the file in{" "}
                <code>public/media/puzzles/</code> and run{" "}
                <code>npm run media:manifest</code> — then pick it from the
                Library tab.
              </Callout>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-3 text-sm font-bold text-ink transition hover:bg-ink/[0.04]">
                Choose an image (max {formatBytes(MAX_UPLOAD_BYTES)})
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>

              {uploadError && <Callout tone="error">{uploadError}</Callout>}

              <Callout tone={quotaTone}>
                Questions currently use about{" "}
                <strong>{formatBytes(bankBytes)}</strong> of roughly 5 MB
                available in this browser.
                {bankBytes > WARN_BANK_BYTES &&
                  " Export a backup and consider moving images into public/media/puzzles/."}
              </Callout>
            </div>
          )}
        </div>

        {value && (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 bg-ink/[0.02] px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
              Current
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-10 w-10 rounded-lg border border-ink/12 object-contain"
            />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
              {isUpload(value)
                ? `Uploaded image (${formatBytes(dataUriBytes(value))})`
                : value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
