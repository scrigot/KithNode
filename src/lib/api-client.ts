/**
 * Wrapper around fetch() for internal API calls. Handles 401 by redirecting
 * to the sign-in entry point so users see a useful prompt instead of an
 * inscrutable empty page.
 *
 * Defaults to cache: "no-store" to match the existing dashboard convention,
 * but callers can override.
 */
export async function apiFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const res = await fetch(input, { cache: "no-store", ...init });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/?signin=required";
  }
  return res;
}
