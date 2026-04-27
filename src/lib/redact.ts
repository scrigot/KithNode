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
 * Returns a redacted shallow copy. The fields that identify a real person
 * (name, email, linkedInUrl) get blurred, plus an `isRedacted: true` flag.
 * Other fields (firmName, title, score, tier, affiliations, education,
 * location) stay as-is — they're aggregate signal, not PII.
 */
export function redactContact<T extends RedactableContact>(
  c: T,
): T & { name: string; email: string; linkedInUrl: string; isRedacted: true } {
  return {
    ...c,
    name: redactName(c.name),
    email: c.email ? redactEmail(c.email) : "",
    linkedInUrl: c.linkedInUrl ? redactLinkedInUrl(c.linkedInUrl) : "",
    isRedacted: true,
  };
}

/** Conditional: redact only when the contact wasn't imported by the current user. */
export function maybeRedact<T extends RedactableContact>(
  c: T,
  currentUserId: string,
): T | (T & { name: string; email: string; linkedInUrl: string; isRedacted: true }) {
  if (c.importedByUserId && c.importedByUserId === currentUserId) return c;
  return redactContact(c);
}
