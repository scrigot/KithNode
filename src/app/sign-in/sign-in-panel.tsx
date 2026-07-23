"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogoIcon } from "@/components/logo";

function safeCallbackUrl(value: string | null) {
  if (!value) return "/dashboard";

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new globalThis.URL(value);
    if (url.origin === globalThis.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}

export function SignInPanel() {
  const searchParams = useSearchParams();
  const isAccessDenied = searchParams.get("error") === "AccessDenied";
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-8 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          &larr; Back
        </Link>

        <div className="rounded-2xl border border-border-soft bg-white p-8">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-8 w-8 text-slate-900" />
            <span className="font-heading text-xl font-semibold tracking-tight text-text-primary">
              Kith<span className="text-primary">Node</span>
            </span>
          </div>
          <h1 className="mt-8 font-heading text-4xl font-semibold tracking-tight text-text-primary">
            Welcome back.
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
              Sign in to continue your recruiting work, conversations, and saved evidence.
            </p>
          )}

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="mt-8 min-h-12 w-full rounded-lg bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Continue with Google
          </button>

          {process.env.NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED === "true" && (
            <button
              type="button"
              onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
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
