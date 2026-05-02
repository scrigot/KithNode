// UNC Greek chapter / club executive roster scraper.
//
// KNOWN_UNC_GROUPS is intentionally empty -- Sam should populate it with
// chapter exec page URLs and the CSS selector that identifies member names.
//
// When the array is empty, scrapeUncGroups() returns [] immediately and the
// orchestration route skips this source.

import * as cheerio from "cheerio";
import type { AlumniSeed } from "./types";

export interface GroupSeed {
  /** Human-readable group name, e.g. "Chi Phi - Alpha Omega Chapter" */
  name: string;
  /** URL of the page listing current officers / executives */
  execPageUrl: string;
  /** CSS selector that matches each member name element on execPageUrl */
  memberSelector: string;
}

// TODO: Sam — add chapter exec page URLs here.
// Example entry:
// {
//   name: "Chi Phi - Alpha Omega Chapter",
//   execPageUrl: "https://...",
//   memberSelector: ".officer-name",
// }
export const KNOWN_UNC_GROUPS: GroupSeed[] = [];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

export async function scrapeUncGroups(
  opts: { throttleMs?: number } = {},
): Promise<AlumniSeed[]> {
  if (KNOWN_UNC_GROUPS.length === 0) return [];

  const throttleMs = opts.throttleMs ?? 1200;
  const out: AlumniSeed[] = [];

  for (let i = 0; i < KNOWN_UNC_GROUPS.length; i++) {
    if (i > 0 && throttleMs > 0) await wait(throttleMs);
    const group = KNOWN_UNC_GROUPS[i];
    try {
      const html = await fetchText(group.execPageUrl);
      if (!html) {
        console.warn(`[unc-greek-clubs] No HTML for: ${group.execPageUrl}`);
        continue;
      }
      const $ = cheerio.load(html);
      $(group.memberSelector).each((_, el) => {
        const name = $(el).text().trim();
        if (!name) return;
        out.push({
          name,
          title: "Club Officer",
          firmName: group.name,
          email: "",
          sourceUrl: group.execPageUrl,
          bio: `Officer of ${group.name} at UNC.`,
          university: "UNC",
          location: "Chapel Hill, NC",
          affiliations: `club:${group.name}`,
          source: "unc_greek_clubs",
        });
      });
    } catch (err) {
      console.warn(`[unc-greek-clubs] Failed for ${group.name}:`, err);
    }
  }

  return out;
}
