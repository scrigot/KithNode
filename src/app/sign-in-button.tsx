"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="bg-accent-teal px-8 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-accent-teal/80 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(14,165,233,0.3)]"
    >
      Sign in with Google
    </button>
  );
}
