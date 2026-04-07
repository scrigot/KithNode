"use client";

import { signIn } from "next-auth/react";

export function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.04] bg-[#0A1628]/60 px-6 backdrop-blur-md">
      <div className="flex items-center">
        <span className="font-heading text-lg font-bold tracking-tight">
          <span className="text-text-primary">Kith</span>
          <span className="text-accent-teal">Node</span>
        </span>
      </div>
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="border border-white/[0.12] px-4 py-1.5 text-sm font-medium text-text-secondary transition-all hover:border-accent-teal/40 hover:text-text-primary"
      >
        Sign in
      </button>
    </nav>
  );
}
