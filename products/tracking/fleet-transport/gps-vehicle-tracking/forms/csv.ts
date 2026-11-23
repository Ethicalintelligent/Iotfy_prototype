// CSV for Manage's bulk upload: read a file saved from Excel (commas or semicolons, quoted values,
// a byte-order mark) into rows keyed by the column headers.

/** Splits CSV text into rows of cells. Quotes ("a, b" and "say ""hi""") and CRLF are handled. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  // Excel in many regions saves with semicolons
  const sep =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // drop empty lines
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Rows keyed by the expected headers (matched without case or extra spaces). Columns not in
 * `headers` are listed in `unknown`; expected ones missing from the file in `missing`.
 */
export function csvRecords(
  text: string,
  headers: string[],
): { rows: Record<string, string>[]; unknown: string[]; missing: string[] } {
  const [head = [], ...body] = parseCsv(text);
  const byNorm = new Map(headers.map((h) => [norm(h), h]));
  const cols = head.map((h) => byNorm.get(norm(h)) ?? null);
  const unknown = head.filter((h, i) => h.trim() && !cols[i]).map((h) => h.trim());
  const missing = headers.filter((h) => !cols.includes(h));
  const rows = body.map((cells) => {
    const r: Record<string, string> = {};
    cols.forEach((h, i) => {
      if (h) r[h] = (cells[i] ?? '').trim();
    });
    return r;
  });
  return { rows, unknown, missing };
}

/** One CSV line from values (quoted when needed). */
export const csvLine = (values: unknown[]) =>
  values
    .map((v) => {
      const s = v == null ? '' : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
