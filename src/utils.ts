// Shared helpers for PenguWave.
//
// Note: the previous `sanitizeHtml()` here was a no-op stub used to render
// untrusted event descriptions as raw HTML — a stored-XSS hole (the mock data
// even contains an `<img onerror=...>` payload). It has been removed: the UI now
// renders descriptions as plain text, so no HTML sanitization is needed at all.

/** Escape a single CSV field per RFC 4180 (quote-wrap when it contains ", , or newlines). */
function csvField(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/**
 * Serialize rows to CSV using an explicit, ordered column set.
 * Properly escapes commas, quotes, and newlines so the file opens cleanly in a
 * spreadsheet — unlike a naive `join(",")`, which breaks on real event data.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => csvField(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => csvField(c.value(row))).join(","));
  return [head, ...body].join("\r\n");
}

/** Trigger a client-side file download for the given text content. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
