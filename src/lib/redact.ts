const BLOCK = "\u2588"; // █

function blurToken(token: string, keepFirst = 1): string {
  if (!token) return "";
  if (token.length <= keepFirst) return token + BLOCK.repeat(3);
  return token.slice(0, keepFirst) + BLOCK.repeat(Math.max(3, Math.min(token.length - keepFirst, 8)));
}

/** Redacts a person's name by keeping first letter of each token. "Jacob Goldstein" -> "J██████ G█████████". */
export function redactName(name: string): string {
  if (!name) return BLOCK.repeat(6);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => blurToken(t, 1))
    .join(" ");
}

export function redactEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  return `${blurToken(local, 1)}@${blurToken(domain.split(".")[0], 1)}.${domain.split(".").slice(1).join(".") || "com"}`;
}

export function redactLinkedInUrl(_url: string): string {
  return "linkedin.com/in/" + BLOCK.repeat(8);
}

export interface RedactableContact {
  name: string;
  email?: string;
  linkedInUrl?: string;
  importedByUserId?: string;
}

/**
 * Fields safe to expose for a pool contact (one imported by another user).
 * Anything NOT listed here is dropped, so the importing owner's private
 * relationship columns (isFriend, lastSpokenAt, speakFrequency, hometown,
 * highSchool, passions) and the owner's identity (importedByUserId, email)
 * can never reach a different user. The supabase-js client uses the service
 * role key, so this projection — not RLS — is the only thing scoping the pool.
 */
const POOL_SAFE_FIELDS = [
  "id",
  "name",
  "firmName",
  "title",
  "university",
  "linkedInUrl",
  "location",
  "education",
  "affiliations",
  "warmthScore",
  "tier",
  "graduationYear",
  "industry",
  "source",
  "degrees",
  "concentration",
  "track",
  "role",
] as const;

export interface RedactedContact {
  name: string;
  email: string;
  linkedInUrl: string;
  isRedacted: true;
  [key: string]: unknown;
}

/**
 * Returns an allowlisted, redacted object for a pool contact. Only the fields
 * in POOL_SAFE_FIELDS are copied across; the rest (owner PII + private
 * relationship data) are dropped entirely rather than spread-and-blurred, so
 * they never appear in the redacted OR (after unlock) shape. The person-
 * identifying fields (name, linkedInUrl) are blurred while locked; `email` is
 * always emptied for a pool contact and `isRedacted: true` is set.
 */
export function redactContact<T extends RedactableContact>(c: T): RedactedContact {
  const out: Record<string, unknown> = {};
  for (const key of POOL_SAFE_FIELDS) {
    if (key in c && c[key as keyof T] !== undefined) {
      out[key] = c[key as keyof T];
    }
  }
  out.name = redactName(c.name);
  out.email = "";
  out.linkedInUrl = c.linkedInUrl ? redactLinkedInUrl(c.linkedInUrl) : "";
  out.isRedacted = true;
  return out as RedactedContact;
}

/**
 * Returns an allowlisted, UNREDACTED object for a pool contact. Same field
 * projection as redactContact (private columns dropped, email emptied) but the
 * person-identifying fields stay clear — used when a high_value unlock reveals
 * name / firm / title / linkedInUrl / location / education. `isRedacted` is
 * deliberately false so the UI renders the real identity.
 */
export function poolSafeContact<T extends RedactableContact>(
  c: T,
): Record<string, unknown> & { email: string; isRedacted: false } {
  const out: Record<string, unknown> = {};
  for (const key of POOL_SAFE_FIELDS) {
    if (key in c && c[key as keyof T] !== undefined) {
      out[key] = c[key as keyof T];
    }
  }
  out.email = "";
  out.isRedacted = false;
  return out as Record<string, unknown> & { email: string; isRedacted: false };
}

/** Conditional: redact only when the contact wasn't imported by the current user. */
export function maybeRedact<T extends RedactableContact>(
  c: T,
  currentUserId: string,
): T | RedactedContact {
  if (c.importedByUserId && c.importedByUserId === currentUserId) return c;
  return redactContact(c);
}
