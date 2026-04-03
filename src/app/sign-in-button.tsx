"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="rounded-none border border-accent-teal/40 bg-accent-teal/10 px-8 py-3.5 text-sm font-semibold text-accent-teal shadow-[0_0_20px_-5px_rgba(14,165,233,0.3)] transition-all hover:scale-[1.02] hover:bg-accent-teal hover:text-white hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.5)]"
    >
      Sign in with Google
    </button>
  );
}
