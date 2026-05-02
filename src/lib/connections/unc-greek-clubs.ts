// UNC student-org executive contact scraper (HeelLife / CampusLabs Engage).
//
// Each entry in KNOWN_UNC_GROUPS maps to an org's HeelLife "about" page.
// The page embeds `window.initialAppState` JSON which exposes the org's
// primaryContact (name + UNC email) without authentication.
//
// scrapeUncGroups() fetches each about page, parses initialAppState, and
// produces one AlumniSeed per org (the primaryContact is the exec/president).
//
// Source tag: "unc_student_orgs"

import type { AlumniSeed } from "./types";

export interface GroupSeed {
  /** Human-readable group name */
  name: string;
  /** HeelLife websiteKey slug, e.g. "uncakpsi" */
  heellifeKey: string;
  /** Primary role label for the contact (e.g. "President") */
  role: string;
}

// Target orgs for KithNode's IB/PE/Consulting/AI recruiting users.
// All confirmed to expose primaryContact via initialAppState (probed 2026-05-02).
export const KNOWN_UNC_GROUPS: GroupSeed[] = [
  {
    name: "Clearwater Investment Group",
    heellifeKey: "clearwaterinvestmentgroup",
    role: "President",
  },
  {
    name: "Alpha Kappa Psi",
    heellifeKey: "uncakpsi",
    role: "President",
  },
  {
    name: "UNC-CH Finance Society",
    heellifeKey: "ufs",
    role: "President",
  },
  {
    name: "Undergraduate Consulting Club",
    heellifeKey: "undergradudate-consulting-club",
    role: "President",
  },
  {
    name: "Sigma Eta Pi",
    heellifeKey: "tba",
    role: "President",
  },
  {
    name: "Chi Phi",
    heellifeKey: "aachiphi",
    role: "President",
  },
  {
    name: "Private Equity Society",
    heellifeKey: "pes",
    role: "President",
  },
  {
    name: "PE & Venture Capital Club at Carolina",
    heellifeKey: "pevc-carolina",
    role: "President",
  },
  {
    name: "AI Consulting",
    heellifeKey: "aiconsulting",
    role: "President",
  },
  {
    name: "Asset and Wealth Management at Carolina",
    heellifeKey: "assetandwealthmanagement",
    role: "President",
  },
];

const BASE_URL = "https://heellife.unc.edu";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Matches: window.initialAppState = {...};
// Captured group 1 is the JSON object.
const INITIAL_STATE_RE =
  /window\.initialAppState\s*=\s*(\{[\s\S]*?\});\s*<\/script>/;

interface HeelLifeContact {
  id?: string;
  firstName?: string;
  preferredFirstName?: string | null;
  lastName?: string;
  primaryEmailAddress?: string;
}

interface HeelLifeOrg {
  name?: string;
  primaryContact?: HeelLifeContact | null;
}

interface HeelLifeState {
  preFetchedData?: {
    organization?: HeelLifeOrg | null;
  };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse window.initialAppState from a HeelLife org/about page HTML. */
export function parseInitialAppState(html: string): HeelLifeState | null {
  const m = INITIAL_STATE_RE.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as HeelLifeState;
  } catch {
    return null;
  }
}

/** Extract an AlumniSeed from a parsed HeelLife initialAppState + GroupSeed. */
export function extractSeedFromState(
  state: HeelLifeState,
  group: GroupSeed,
  sourceUrl: string,
): AlumniSeed | null {
  const org = state.preFetchedData?.organization;
  if (!org) return null;

  const contact = org.primaryContact;
  if (!contact) return null;

  const first =
    contact.preferredFirstName?.trim() || contact.firstName?.trim() || "";
  const last = contact.lastName?.trim() || "";
  const name = [first, last].filter(Boolean).join(" ");
  if (!name) return null;

  const email = contact.primaryEmailAddress?.trim() ?? "";
  // Only keep UNC email addresses.
  const uncEmailRe = /@(?:unc|email\.unc)\.edu$/i;
  const cleanEmail = uncEmailRe.test(email) ? email : "";

  const orgName = org.name?.trim() || group.name;
  const title = `${group.role} | ${orgName}`;

  return {
    name,
    title,
    firmName: orgName,
    email: cleanEmail,
    sourceUrl,
    bio: `${group.role} of ${orgName} at UNC Chapel Hill.`,
    university: "UNC",
    location: "Chapel Hill, NC",
    affiliations: `active_student,role:${group.role},org:${orgName}`,
    source: "unc_student_orgs",
  };
}

export async function scrapeUncGroups(
  opts: { throttleMs?: number } = {},
): Promise<AlumniSeed[]> {
  if (KNOWN_UNC_GROUPS.length === 0) return [];

  const throttleMs = opts.throttleMs ?? 1500;
  const out: AlumniSeed[] = [];

  for (let i = 0; i < KNOWN_UNC_GROUPS.length; i++) {
    if (i > 0 && throttleMs > 0) await wait(throttleMs);

    const group = KNOWN_UNC_GROUPS[i];
    const sourceUrl = `${BASE_URL}/organization/${group.heellifeKey}/about`;

    try {
      const html = await fetchText(sourceUrl);
      if (!html) {
        console.warn(`[unc-greek-clubs] No HTML for: ${sourceUrl}`);
        continue;
      }

      const state = parseInitialAppState(html);
      if (!state) {
        console.warn(
          `[unc-greek-clubs] No initialAppState on: ${sourceUrl}`,
        );
        continue;
      }

      const seed = extractSeedFromState(state, group, sourceUrl);
      if (!seed) {
        console.warn(
          `[unc-greek-clubs] No primaryContact for: ${group.name}`,
        );
        continue;
      }

      out.push(seed);
    } catch (err) {
      console.warn(`[unc-greek-clubs] Failed for ${group.name}:`, err);
    }
  }

  return out;
}
