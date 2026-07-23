export const LINKEDIN_PROFILE_RE = /^https:\/\/(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i;

export function normalizeLinkedInProfileUrl(value: string): string | null {
  const match = value.trim().match(LINKEDIN_PROFILE_RE);
  return match ? `https://www.linkedin.com/in/${match[1].toLowerCase()}` : null;
}

export interface ResearchTarget {
  company: string;
  role: string;
  location: string;
  school: string;
}

/** Builds a user-opened LinkedIn search URL. KithNode never fetches it. */
export function buildLinkedInPeopleSearch(target: ResearchTarget): string {
  const terms = [target.role, target.company, target.school, target.location]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  const params = new URLSearchParams({ keywords: terms });
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

export function isApprovedResearchSource(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new globalThis.URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
