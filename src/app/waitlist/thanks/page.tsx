import Link from "next/link";
import { Suspense } from "react";
import { CopyRefButton } from "./copy-ref-button";

export const metadata = {
  title: "You're on the list — KithNode",
};

export default function ThanksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0369A1] via-[#0EA5E9] to-[#06B6D4]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16 text-white">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-10 backdrop-blur-lg sm:p-12">
          <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            You&apos;re in
          </span>
          <h1 className="mt-5 font-heading text-5xl font-bold tracking-tight">
            Thanks for requesting access.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/90">
            Sam is hand-picking the first 50 alpha users over the next few weeks. Expect a personal email shortly. In the meantime, two things help you skip the queue.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <div className="rounded-xl bg-white/10 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Share your spot
              </div>
              <p className="mt-2 text-sm text-white/90">
                Referrals move you up the list. Send this link to anyone you&apos;d vouch for.
              </p>
              <Suspense
                fallback={
                  <div className="mt-4 h-10 w-full rounded-lg border border-white/20 bg-white/5" />
                }
              >
                <CopyRefButton />
              </Suspense>
            </div>

            <div className="rounded-xl bg-white/10 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Tell Sam what&apos;s broken
              </div>
              <p className="mt-2 text-sm text-white/90">
                What was the last cold LinkedIn message you sent that didn&apos;t land? Reply to the confirmation email or ping{" "}
                <a
                  href="https://www.linkedin.com/in/samrigot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:text-white"
                >
                  Sam on LinkedIn
                </a>
                . He reads every one.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="mt-10 inline-flex items-center text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
