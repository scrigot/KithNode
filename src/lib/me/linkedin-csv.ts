// Parser for LinkedIn's official "Connections.csv" export.
//
// The export has quirks this handles:
//  - A "Notes:" preamble (2-3 lines + a blank) BEFORE the real header row. We
//    locate the header by finding the record containing "First Name" + "URL".
//  - RFC-4180 quoting: fields may be quoted, contain commas, embedded newlines,
//    and doubled "" escapes.
//  - A UTF-8 BOM at the start.
//  - Columns are mapped BY HEADER NAME, so column reordering doesn't break it.
//
// Pure + dependency-free so it's unit-tested without a DB or network. The import
// route (src/app/api/me/import/linkedin) feeds rows into MeContact via Prisma.

export interface ParsedConnection {
  name: string;
  firstName: string;
  lastName: string;
  /** Normalized LinkedIn URL ("" when absent/invalid). */
  linkedInUrl: string;
  email: string;
  firmName: string;
  title: string;
  /** ISO date string from "Connected On" ("DD Mon YYYY"), or null. */
  connectedOn: string | null;
}

export interface ParseResult {
  rows: ParsedConnection[];
  /** Rows dropped for having neither a name nor a URL. */
  skipped: number;
  /** True when a header row with First Name + URL was located. */
  headerFound: boolean;
}

// ── CSV tokenizer ───────────────────────────────────────────────────────────
// State machine → array of records, each an array of string fields. Handles
// quotes, doubled-quote escapes, commas and newlines inside quotes, and \r\n.
function tokenizeCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, ""); // strip BOM
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // End of record. Swallow the \n of a \r\n pair.
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      // Skip fully-empty records (blank lines).
      if (record.some((f) => f.trim() !== "")) records.push(record);
      record = [];
    } else {
      field += c;
    }
  }
  // Flush trailing field/record (file without trailing newline).
  if (field !== "" || record.length > 0) {
    record.push(field);
    if (record.some((f) => f.trim() !== "")) records.push(record);
  }
  return records;
}

/** Normalize a LinkedIn profile URL for stable per-user dedup. "" if not a
 *  linkedin.com/in/ URL. Lowercases, drops query/hash, trailing slash. */
export function normalizeLinkedInUrl(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  let url = s;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const u = new globalThis.URL(url);
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return "";
    const path = u.pathname.replace(/\/+$/, ""); // strip trailing slash
    if (!/^\/in\//i.test(path)) return "";
    return `https://www.linkedin.com${path.toLowerCase()}`;
  } catch {
    return "";
  }
}

function parseConnectedOn(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const d = new Date(s); // LinkedIn uses "DD Mon YYYY" (e.g. "01 Jan 2024")
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const norm = (s: string) => (s || "").trim().toLowerCase();

export function parseLinkedInCsv(csv: string): ParseResult {
  const records = tokenizeCsv(csv);

  // Locate the header row: the first record containing both "first name" and "url".
  let headerIdx = -1;
  for (let i = 0; i < records.length; i++) {
    const lower = records[i].map(norm);
    if (lower.includes("first name") && lower.includes("url")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { rows: [], skipped: 0, headerFound: false };

  const header = records[headerIdx].map(norm);
  const col = (name: string) => header.indexOf(name);
  const idx = {
    first: col("first name"),
    last: col("last name"),
    url: col("url"),
    email: col("email address"),
    company: col("company"),
    position: col("position"),
    connected: col("connected on"),
  };
  const at = (rec: string[], i: number) => (i >= 0 && i < rec.length ? rec[i].trim() : "");

  const rows: ParsedConnection[] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < records.length; i++) {
    const rec = records[i];
    const firstName = at(rec, idx.first);
    const lastName = at(rec, idx.last);
    const name = `${firstName} ${lastName}`.trim();
    const linkedInUrl = normalizeLinkedInUrl(at(rec, idx.url));
    if (!name && !linkedInUrl) {
      skipped++;
      continue;
    }
    rows.push({
      name: name || linkedInUrl,
      firstName,
      lastName,
      linkedInUrl,
      email: at(rec, idx.email),
      firmName: at(rec, idx.company),
      title: at(rec, idx.position),
      connectedOn: parseConnectedOn(at(rec, idx.connected)),
    });
  }

  return { rows, skipped, headerFound: true };
}
