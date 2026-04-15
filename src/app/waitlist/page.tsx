import Link from "next/link";
import { Suspense } from "react";
import { WaitlistForm } from "./waitlist-form";

export const metadata = {
  title: "Request Access — KithNode",
  description: "Private alpha opening to 50 students this spring.",
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#F1F5F9]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-8 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          &larr; Back
        </Link>

        <div className="mb-10">
          <span className="inline-flex items-center rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0EA5E9]">
            Private Alpha &middot; Free for founding users
          </span>
          <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Request Access
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Private alpha opening to 50 students this spring. Tell us where you&apos;re recruiting and Sam will reach out personally.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-10">
          <Suspense>
            <WaitlistForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
