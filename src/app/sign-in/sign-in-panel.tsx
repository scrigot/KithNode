"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogoIcon } from "@/components/logo";

export function SignInPanel() {
  const searchParams = useSearchParams();
  const isAccessDenied = searchParams.get("error") === "AccessDenied";

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

          {isAccessDenied ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                That email isn&apos;t on the alpha list yet.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Request access by emailing{" "}
                <a
                  href="mailto:samrigot31@gmail.com"
                  className="font-semibold underline hover:text-amber-900"
                >
                  samrigot31@gmail.com
                </a>{" "}
                or{" "}
                <Link href="/waitlist" className="font-semibold underline hover:text-amber-900">
                  joining the waitlist
                </Link>
                .
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Access is currently limited to approved alpha users and UNC emails.
            </p>
          )}

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="mt-8 w-full rounded-lg bg-[#0369A1] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#075985] hover:shadow-xl"
          >
            Continue with Google
          </button>

          {process.env.NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED === "true" && (
            <button
              type="button"
              onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50"
            >
              Continue with Microsoft (UNC email)
            </button>
          )}

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
