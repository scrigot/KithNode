"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="min-h-11 border border-red-400/30 px-4 py-2 text-sm font-bold text-red-300 transition-colors hover:bg-red-400/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
    >
      Sign Out
    </button>
  );
}
