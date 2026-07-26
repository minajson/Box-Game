"use client";

import { useRef, useState } from "react";

import { KNOWN_ASSETS } from "@/lib/media";
import { dateStamp, downloadText, estimateBankBytes, readTextFile } from "@/lib/download";
import { formatBytes } from "@/lib/media";
import {
  CSV_COLUMNS,
  CSV_COLUMN_HELP,
  csvTemplate,
  exportBankJson,
  exportPuzzlesCsv,
  importBankJson,
  importPuzzlesCsv,
  rejectedRowsCsv,
  type ImportMode,
  type ImportReport,
} from "@/lib/puzzleCsv";
import type { ManagedPuzzle } from "@/lib/types";

import { Btn, Callout, Section, Segmented } from "./ui";

/**
 * Import and export.
 *
 * The import is a TWO-STEP flow on purpose: choosing a file produces a report
 * and nothing else, and only "Apply" writes. That is what makes it safe to point
 * at a file you are unsure about — and it is why `importPuzzlesCsv` is a pure
 * function that returns the next bank rather than saving it.
 */

const MODES: Array<{ value: ImportMode; label: string }> = [
  { value: "add-only", label: "Add new only" },
  { value: "update-existing", label: "Update existing" },
  { value: "replace-all", label: "Replace everything" },
];

const MODE_HELP: Record<ImportMode, string> = {
  "add-only":
    "Every row becomes a new question. Rows matching a question already in the bank are skipped, and nothing you already have is changed.",
  "update-existing":
    "Rows whose uid matches a question in the bank overwrite it; the rest are added. This is the mode for a round trip through a spreadsheet.",
  "replace-all":
    "Throws away every question in this browser and keeps only what is in the file. Export a backup first.",
};

export default function ImportExportPanel({
  bank,
  onApply,
  onClose,
}: {
  bank: ManagedPuzzle[];
  /** Returns true when the write succeeded. */
  onApply: (next: ManagedPuzzle[], successText: string) => boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<ImportMode>("add-only");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bytes = estimateBankBytes(bank);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await readTextFile(file);
      setSourceText(text);
      setSourceName(file.name);
      const isJson =
        file.name.toLowerCase().endsWith(".json") || text.trimStart().startsWith("{") || text.trimStart().startsWith("[");
      setReport(
        isJson
          ? importBankJson(text, bank, mode, KNOWN_ASSETS)
          : importPuzzlesCsv(text, bank, mode, KNOWN_ASSETS),
      );
    } catch (err) {
      setReport({
        fileErrors: [err instanceof Error ? err.message : "Could not read that file."],
        unknownColumns: [],
        rows: [],
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      });
    } finally {
      setBusy(false);
    }
  };

  /** Re-run the report when the mode changes — the outcome depends on it. */
  const changeMode = (next: ImportMode) => {
    setMode(next);
    if (!sourceText) return;
    const isJson = sourceName.toLowerCase().endsWith(".json") || sourceText.trimStart().startsWith("{");
    setReport(
      isJson
        ? importBankJson(sourceText, bank, next, KNOWN_ASSETS)
        : importPuzzlesCsv(sourceText, bank, next, KNOWN_ASSETS),
    );
  };

  const reset = () => {
    setReport(null);
    setSourceText("");
    setSourceName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const apply = () => {
    if (!report?.nextBank) return;
    const changed = report.imported + report.updated;
    const ok = onApply(
      report.nextBank,
      `Imported ${report.imported}, updated ${report.updated}, skipped ${report.skipped}, ${report.failed} with errors.`,
    );
    if (ok && changed > 0) reset();
  };

  const canApply =
    report != null &&
    report.fileErrors.length === 0 &&
    report.nextBank != null &&
    report.imported + report.updated > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-ink">Import &amp; export</h2>
        <Btn onClick={onClose}>← Back to questions</Btn>
      </div>

      {/* ------------------------------------------------------------ export */}
      <Section
        title="Export"
        description={`Your ${bank.length} question${bank.length === 1 ? "" : "s"} live in this browser only (about ${formatBytes(bytes)}). Export to move them to another machine or to keep a backup.`}
      >
        <div className="flex flex-wrap gap-2">
          <Btn
            tone="primary"
            onClick={() =>
              downloadText(
                `crack-the-box-questions-${dateStamp()}.csv`,
                exportPuzzlesCsv(bank),
                "text/csv;charset=utf-8",
              )
            }
          >
            Export CSV
          </Btn>
          <Btn
            onClick={() =>
              downloadText(
                `crack-the-box-questions-${dateStamp()}.json`,
                exportBankJson(bank),
                "application/json;charset=utf-8",
              )
            }
          >
            Export JSON backup
          </Btn>
          <Btn
            onClick={() =>
              downloadText(
                "crack-the-box-question-template.csv",
                csvTemplate(),
                "text/csv;charset=utf-8",
              )
            }
          >
            Download CSV template
          </Btn>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          <strong className="text-ink">CSV</strong> opens in Excel, Numbers and
          Google Sheets and is the one to edit by hand.{" "}
          <strong className="text-ink">JSON</strong> is a lossless backup — use it
          to copy a bank between machines exactly.
        </p>
      </Section>

      {/* ------------------------------------------------------------ import */}
      <Section title="Import" description="Nothing is saved until you press Apply.">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
              What should happen to existing questions?
            </p>
            <Segmented
              label="Import mode"
              value={mode}
              options={MODES}
              onChange={changeMode}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {MODE_HELP[mode]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink/[0.04]">
              Choose a CSV or JSON file
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="sr-only"
                onChange={(e) => void pick(e.target.files?.[0])}
              />
            </label>
            {sourceName && (
              <span className="text-xs font-semibold text-ink-soft">
                {sourceName}
                <button
                  type="button"
                  onClick={reset}
                  className="ml-2 underline hover:text-ink"
                >
                  clear
                </button>
              </span>
            )}
            {busy && <span className="text-xs font-bold text-ink-soft">Reading…</span>}
          </div>

          {report && <Report report={report} sourceText={sourceText} />}

          {report && (
            <div className="flex flex-wrap items-center gap-2">
              <Btn tone="primary" disabled={!canApply} onClick={apply}>
                {canApply
                  ? `Apply ${report.imported + report.updated} change${
                      report.imported + report.updated === 1 ? "" : "s"
                    }`
                  : "Nothing to apply"}
              </Btn>
              {report.failed > 0 && (
                <Btn
                  onClick={() =>
                    downloadText(
                      `rejected-rows-${dateStamp()}.csv`,
                      rejectedRowsCsv(sourceText, report),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download {report.failed} rejected row
                  {report.failed === 1 ? "" : "s"}
                </Btn>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* --------------------------------------------------------- reference */}
      <Section title="Column reference" description="Matched by name, so column order does not matter.">
        <details>
          <summary className="cursor-pointer text-sm font-bold text-ink">
            Show all {CSV_COLUMNS.length} columns
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <thead>
                <tr className="border-b border-ink/10 text-[10px] font-black uppercase tracking-[0.12em] text-ink-soft">
                  <th className="py-1.5 pr-3">Column</th>
                  <th className="py-1.5">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {CSV_COLUMNS.map((c) => (
                  <tr key={c} className="border-b border-ink/6 last:border-b-0">
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top font-bold text-ink">
                      {c}
                    </td>
                    <td className="py-1.5 align-top leading-relaxed text-ink-soft">
                      {CSV_COLUMN_HELP[c]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- report -- */

function Report({
  report,
  sourceText,
}: {
  report: ImportReport;
  sourceText: string;
}) {
  const problems = report.rows.filter((r) => r.status === "error" || r.status === "skipped");

  if (report.fileErrors.length > 0) {
    return (
      <Callout tone="error" title="Nothing was imported">
        <ul className="list-disc space-y-1 pl-4">
          {report.fileErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        <p className="mt-2">Your existing questions are untouched.</p>
      </Callout>
    );
  }

  return (
    <div className="flex flex-col gap-2.5" aria-live="polite">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="To add" value={report.imported} tone="green" />
        <Stat label="To update" value={report.updated} tone="sky" />
        <Stat label="Skipped" value={report.skipped} tone="amber" />
        <Stat label="With errors" value={report.failed} tone="red" />
      </div>

      {report.unknownColumns.length > 0 && (
        <Callout tone="warn">
          Ignored {report.unknownColumns.length} unrecognised column
          {report.unknownColumns.length === 1 ? "" : "s"}:{" "}
          <strong>{report.unknownColumns.join(", ")}</strong>.
        </Callout>
      )}

      {problems.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-ink/12">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink/[0.03] text-[10px] font-black uppercase tracking-[0.12em] text-ink-soft">
              <tr>
                <th className="px-2.5 py-2">Line</th>
                <th className="px-2.5 py-2">Answer</th>
                <th className="px-2.5 py-2">What is wrong</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((r) => (
                <tr key={r.line} className="border-t border-ink/8 align-top">
                  <td className="whitespace-nowrap px-2.5 py-2 font-black text-ink">
                    {r.line}
                  </td>
                  <td className="px-2.5 py-2 font-semibold text-ink">
                    {r.answer || <span className="text-ink-soft">—</span>}
                  </td>
                  <td className="px-2.5 py-2 leading-relaxed">
                    {r.status === "skipped" ? (
                      <span className="text-amber-800">{r.reason}</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {r.issues.map((iss, i) => (
                          <li key={i} className="text-red-700">
                            <strong>{iss.field}</strong> — {iss.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.failed === 0 && report.skipped === 0 && report.imported + report.updated > 0 && (
        <Callout tone="success">
          Every row is valid. Press Apply to save them.
        </Callout>
      )}

      {report.imported + report.updated === 0 && report.failed > 0 && (
        <Callout tone="error">
          No row could be imported. Fix the problems above, or download the
          rejected rows, correct them and try again.
        </Callout>
      )}

      <p className="text-[11px] text-ink-soft">
        Read {sourceText.split(/\r\n|\r|\n/).filter((l) => l.trim()).length} line
        {sourceText.split(/\r\n|\r|\n/).filter((l) => l.trim()).length === 1 ? "" : "s"} from the file.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "sky" | "amber" | "red";
}) {
  const tones = {
    green: "border-ren-green/30 bg-ren-green-soft text-ren-green-deep",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    amber: "border-amber-300 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
    </div>
  );
}
