import { Suspense } from "react";
import { SignInPanel } from "./sign-in-panel";

export const metadata = {
  title: "Sign in",
  description: "Sign in to KithNode.",
};

export default function SignInPage() {
  // SignInPanel reads ?error via useSearchParams(), which requires a Suspense
  // boundary for static prerender in the App Router (Next.js build error
  // otherwise). The panel is tiny, so an empty fallback is fine.
  return (
    <Suspense fallback={null}>
      <SignInPanel />
    </Suspense>
  );
}
