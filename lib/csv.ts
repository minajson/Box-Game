/**
 * A small, dependency-free CSV reader and writer (RFC 4180 shaped).
 *
 * Knows nothing about questions — see lib/puzzleCsv.ts for that. Written by hand
 * because the project has four runtime dependencies and a CSV parser is about
 * sixty lines; pulling one in for this would be the larger cost.
 *
 * Handles what a real spreadsheet export actually contains:
 *   - quoted fields, with "" as an escaped quote
 *   - commas, CR, LF and CRLF *inside* quoted fields
 *   - CRLF / LF / CR line endings, mixed
 *   - a UTF-8 BOM at the start (Excel writes one)
 *
 * Fields are NOT trimmed: leading space can be meaningful in a prompt, and the
 * caller knows which columns tolerate trimming.
 */

export function parseCsv(text: string): string[][] {
  // Excel prefixes UTF-8 files with a BOM, which would otherwise become part of
  // the first column's NAME and break header matching.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      endRow();
      // Swallow the LF of a CRLF pair so it does not open an empty row.
      i += src[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // A file that does not end in a newline still has a final row to flush. A file
  // that does would otherwise gain a phantom [""] row.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

const NEEDS_QUOTES = /[",\r\n]/;

function quote(value: string): string {
  // Edge whitespace is quoted too: unquoted, some readers silently strip it.
  if (NEEDS_QUOTES.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(
  rows: string[][],
  opts: { bom?: boolean; eol?: string } = {},
): string {
  const eol = opts.eol ?? "\r\n";
  const body = rows.map((row) => row.map(quote).join(",")).join(eol);
  // CRLF + BOM is what makes Excel open a UTF-8 CSV correctly on both
  // Windows and macOS without an import wizard.
  return `${opts.bom ? "﻿" : ""}${body}${eol}`;
}
