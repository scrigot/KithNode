"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="rounded-lg border border-accent-green bg-transparent px-6 py-3 text-sm font-semibold text-accent-green shadow-sm transition-colors hover:bg-accent-green hover:text-bg-primary"
    >
      Sign in with Google
    </button>
  );
}
