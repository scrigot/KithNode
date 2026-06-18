// AI brain-dump enrichment: parse the rich CSV the user gets from running the
// brain-dump prompt in their own AI chat, map it onto AlumniContact fields, and
// build the (prefs-prefilled) prompt the app hands them.
//
// The point: the high-value FIT boosters (Same School +15, Same Greek +30,
// Same Club +8) key off the user's own first-hand knowledge, which LinkedIn's
// bare CSV export lacks. This module is PURE — parsing + mapping + prompt
// assembly only; the import route owns the DB merge + rescore.

export const BRAIN_DUMP_COLUMNS = [
  "name",
  "company",
  "title",
  "school",
  "major",
  "clubs",
  "greek_org",
  "hometown",
  "high_school",
  "skills",
  "relationship",
  "closeness",
  "notes",
  "linkedin_url",
] as const;

export const BRAIN_DUMP_HEADER = BRAIN_DUMP_COLUMNS.join(",");

export type BrainDumpRow = Record<(typeof BRAIN_DUMP_COLUMNS)[number], string>;

/** What the importer writes to AlumniContact from one brain-dump row. */
export interface BrainDumpContactPatch {
  name: string;
  firmName: string;
  title: string;
  linkedInUrl: string;
  education: string;
  university: string;
  major: string;
  clubs: string;
  greekOrg: string;
  hometown: string;
  highSchool: string;
  skills: string;
  passions: string;
  isFriend: boolean;
  closeness: string;
}

/**
 * RFC-4180-ish CSV tokenizer: handles quoted fields, commas inside quotes,
 * "" escaped quotes, and CRLF/CR newlines. Never throws.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const s = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse the brain-dump CSV into rows keyed by column NAME (resilient to column
 * reordering). The first row containing a "name" cell is treated as the header;
 * any preamble (a fenced ```code block fence, stray prose) before it is skipped.
 * Rows without a name are dropped.
 */
export function parseBrainDumpCSV(text: string): BrainDumpRow[] {
  // Strip a leading/trailing markdown code fence if the user pasted the block.
  const cleaned = (text || "")
    .replace(/^\s*```[a-zA-Z]*\s*\n/, "")
    .replace(/\n```\s*$/, "");
  const grid = parseCSV(cleaned).filter((r) => r.some((c) => c.trim() !== ""));
  if (grid.length === 0) return [];

  const headerIdx = grid.findIndex((r) =>
    r.some((c) => c.trim().toLowerCase() === "name"),
  );
  if (headerIdx === -1) return [];

  const header = grid[headerIdx].map((h) => h.trim().toLowerCase());
  const colIndex: Partial<Record<string, number>> = {};
  for (const col of BRAIN_DUMP_COLUMNS) {
    const idx = header.indexOf(col);
    if (idx !== -1) colIndex[col] = idx;
  }

  const out: BrainDumpRow[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i];
    const row = Object.fromEntries(
      BRAIN_DUMP_COLUMNS.map((col) => {
        const idx = colIndex[col];
        const v = idx === undefined ? "" : (cells[idx] ?? "");
        return [col, v.trim()];
      }),
    ) as BrainDumpRow;
    if (row.name) out.push(row);
  }
  return out;
}

/** Semicolon-separated multi-value → comma-joined flat column (deduped, trimmed). */
function flatList(raw: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw || "").split(/[;,]/).map((p) => p.trim())) {
    const k = part.toLowerCase();
    if (!part || seen.has(k)) continue;
    seen.add(k);
    out.push(part);
  }
  return out.join(", ");
}

const FRIEND_CLOSENESS = new Set(["friend", "close"]);

/**
 * Map one brain-dump row to the AlumniContact fields we write. `relationship`
 * and `notes` fold into `passions` (display + outreach context; it also feeds
 * the affiliation matchers, which only reinforces signals the user supplied).
 * `closeness` of friend/close marks isFriend, which promotes the contact to the
 * KITH relationship class.
 */
export function brainDumpRowToContact(row: BrainDumpRow): BrainDumpContactPatch {
  const school = row.school.trim();
  const passions = [row.relationship, row.notes]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("; ");

  return {
    name: row.name.trim(),
    firmName: row.company.trim(),
    title: row.title.trim(),
    linkedInUrl: row.linkedin_url.trim(),
    education: school,
    university: school,
    major: flatList(row.major),
    clubs: flatList(row.clubs),
    greekOrg: row.greek_org.trim(),
    hometown: row.hometown.trim(),
    highSchool: row.high_school.trim(),
    skills: flatList(row.skills),
    passions,
    isFriend: FRIEND_CLOSENESS.has(row.closeness.trim().toLowerCase()),
    closeness: row.closeness.trim().toLowerCase(),
  };
}

/** The user's own background, injected into the prompt so they don't retype it. */
export interface BrainDumpBackground {
  goal?: string;
  school?: string;
  major?: string;
  clubs?: string;
  greekOrg?: string;
  hometown?: string;
  highSchool?: string;
}

const fill = (v: string | undefined, hint: string): string =>
  v && v.trim() ? v.trim() : `[${hint}]`;

/**
 * Build the brain-dump prompt with the user's background pre-filled. The user
 * pastes their LinkedIn Connections.csv where indicated and runs it in any AI
 * chat. Mirrors docs/the vault spec; pools the top ~10 as the coffee-chat list.
 */
export function buildBrainDumpPrompt(bg: BrainDumpBackground = {}): string {
  return `You are helping me build a structured dataset about my professional network for KithNode, a warm-path networking tool. I will paste my LinkedIn connections below. Work ONLY from that export and from my answers — this is my own first-hand knowledge of people I actually know, not research. Never guess, infer, or invent any fact about a person. If I don't know something, leave it blank.

What I'm recruiting for / my goal:
${fill(bg.goal, "e.g. breaking into investment banking")}

My own background (this defines what counts as a shared connection):
- School: ${fill(bg.school, "e.g. UNC Chapel Hill")}
- Major: ${fill(bg.major, "e.g. Business / Economics")}
- Clubs / orgs: ${fill(bg.clubs, "e.g. 180 Degrees Consulting; Investment Club")}
- Fraternity / sorority: ${fill(bg.greekOrg, "e.g. Chi Phi")}
- Hometown: ${fill(bg.hometown, "e.g. Houston, TX")}
- High school: ${fill(bg.highSchool, "e.g. Memorial High School")}

My connections (pasted from LinkedIn's Connections.csv export):
[PASTE CSV HERE]

Work through this with me efficiently, in this exact order. Ask ONE question at a time and wait for my answer before the next.

1. Tell me how many connections you see. Then ask me to name my TOP ~10 closest or most valuable connections — this is my coffee-chat shortlist — and focus only on those. We can run another pass for more later.

2. To fill shared-affiliation data fast, ask these as GROUP questions — I reply with names, not one person at a time:
   - "Which of these did you know from [my school]?"
   - "Which are in [my fraternity / sorority]?"
   - "Which share a club or org with you — and which one?"
   - "Which are from your hometown or high school?"
   - "Which do you actually talk to or consider friends, vs just a LinkedIn connection?"

3. For my top connections only, one quick optional pass: do I know their major, their skills/interests, or any personal fact worth remembering?

4. Then assemble a CSV with EXACTLY this header and one row per person:

${BRAIN_DUMP_HEADER}

CSV rules:
- One row per person. Use the export for name / company / title / linkedin_url (copy the profile URL from the export's URL column verbatim; blank if none).
- Fill school / major / clubs / greek_org / hometown / high_school / skills ONLY from my answers. Blank if I didn't say it. Do not fabricate.
- Multi-value fields (clubs, skills) separated by semicolons.
- relationship = a few words on how I know them ("UNC classmate", "summer 2025 intern colleague").
- closeness = one of: friend, close, acquaintance, weak.
- notes = any personal fact I mentioned ("rows crew; from Dallas; into climbing").
- If a field contains a comma, wrap the whole field in double quotes.
- Output the CSV inside ONE fenced code block, no commentary inside the block.

Start by confirming my connections and asking for my top 10.`;
}
