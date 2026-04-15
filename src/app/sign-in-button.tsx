"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="rounded-lg bg-accent-teal px-8 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:bg-accent-teal/90 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent-teal/25"
    >
      Get Started with Google
    </button>
  );
}
