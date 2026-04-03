"use client";

import { signIn } from "next-auth/react";

export function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0A1628]/80 px-6 backdrop-blur-sm">
      <div className="flex items-center">
        <span className="font-heading text-lg font-bold tracking-tight">
          <span className="text-text-primary">Kith</span>
          <span className="text-accent-teal">Node</span>
        </span>
      </div>
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        Sign in
      </button>
    </nav>
  );
}
