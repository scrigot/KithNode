// Hardcoded fallback allowlist — always permitted regardless of env.
const FALLBACK_EMAILS = ["samrigot31@gmail.com", "samrigot@kithnode.ai"];

/**
 * Pure allow-check with no NextAuth dependency — safe to import in tests.
 *
 * To add external testers without a redeploy, set:
 *   ALLOWED_EMAILS=tester1@gmail.com,tester2@gmail.com
 * (comma-separated, any case — compared case-insensitively)
 */
export function isEmailAllowed(
  email: string | null | undefined,
  envList: string | undefined = process.env.ALLOWED_EMAILS
): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower.endsWith("@unc.edu") || lower.endsWith("@ad.unc.edu")) return true;
  const extra = envList
    ? envList
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const allowed = [...FALLBACK_EMAILS.map((e) => e.toLowerCase()), ...extra];
  return allowed.includes(lower);
}
