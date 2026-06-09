"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { LogoIcon } from "@/components/logo";

export function SignInPanel() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#F1F5F9]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-8 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          &larr; Back
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-8 w-8 text-slate-900" />
            <span className="font-heading text-lg font-bold tracking-tight text-slate-900">
              Kith<span className="text-[#0EA5E9]">Node</span>
            </span>
          </div>
          <h1 className="mt-8 font-heading text-3xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Access is currently limited to approved alpha users and UNC emails.
          </p>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="mt-8 w-full rounded-lg bg-[#0369A1] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#075985] hover:shadow-xl"
          >
            Continue with Google
          </button>

          <p className="mt-5 text-center text-xs text-slate-500">
            Need access first?{" "}
            <Link
              href="/waitlist"
              className="font-semibold text-[#0369A1] hover:underline"
            >
              Join the waitlist
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
