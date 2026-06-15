import Link from "next/link";
import { Suspense } from "react";
import { WaitlistForm } from "./waitlist-form";
import { PanelOutreach } from "@/app/demo/_components/panel-outreach";

export const metadata = {
  title: "Request Access",
  description:
    "Join the KithNode founding cohort for warm-path finance recruiting.",
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
            I&apos;m{" "}
            <a
              href="https://www.linkedin.com/in/samrigot"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0369A1] hover:underline"
            >
              Sam
            </a>
            , a UNC student building KithNode. Tell me where you&apos;re
            recruiting and I&apos;ll set up your account and reach out myself.
          </p>
        </div>

        {/* Product proof: the real demo outreach panel, so visitors see actual
            output (a drafted message grounded in shared signals) before handing
            over personal details. The flip trigger the testers named. */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            What it actually produces
          </p>
          <PanelOutreach />
          <p className="mt-3 text-sm text-slate-500">
            Live demo with sample data.{" "}
            <Link
              href="/demo"
              className="font-semibold text-[#0369A1] hover:underline"
            >
              Explore the full demo &rarr;
            </Link>
          </p>
        </div>

        {/* Trust panel: answers "where does the data come from + is my account safe"
            before any personal field is asked. This is the bounce point testers named. */}
        <div className="mb-6 rounded-2xl border border-[#0EA5E9]/20 bg-[#0EA5E9]/[0.05] p-6 sm:p-7">
          <div className="flex items-center gap-2.5">
            <ShieldCheckIcon />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Your LinkedIn account stays untouched
            </h2>
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            <TrustRow>
              We never ask for your LinkedIn password and never log into your
              account.
            </TrustRow>
            <TrustRow>
              Warm paths are built from permitted public sources and data you
              choose to share, like your own LinkedIn export.
            </TrustRow>
            <TrustRow>
              No browser extension to install. Nothing ever runs on your
              network.
            </TrustRow>
          </ul>
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

function TrustRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-slate-600">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="#0369A1"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden
      >
        <path d="m4 10 4 4 8-8" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0369A1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
