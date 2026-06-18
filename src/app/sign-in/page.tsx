import { Suspense } from "react";
import { cookies } from "next/headers";
import { SignInPanel } from "./sign-in-panel";

export const metadata = {
  title: "Sign in",
  description: "Sign in to KithNode.",
};

// kith_inviter cookie name — read by the signIn callback to auto-friend on signup.
const INVITER_COOKIE = "kith_inviter";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawInviter = params["kith_inviter"];
  const inviterEmail = typeof rawInviter === "string" ? rawInviter.trim().toLowerCase() : null;

  if (inviterEmail) {
    // Persist across the OAuth redirect (max-age 10 min is enough for the round-trip).
    const jar = await cookies();
    jar.set(INVITER_COOKIE, inviterEmail, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }

  // SignInPanel reads ?error via useSearchParams(), which requires a Suspense
  // boundary for static prerender in the App Router (Next.js build error
  // otherwise). The panel is tiny, so an empty fallback is fine.
  return (
    <Suspense fallback={null}>
      <SignInPanel />
    </Suspense>
  );
}
