"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="bg-accent-teal px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-accent-teal/80"
    >
      Sign in with Google
    </button>
  );
}
