"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-md rounded-2xl border border-border-soft bg-white p-8 text-center">
        <h2 className="font-heading text-3xl font-semibold text-text-primary">KithNode hit a snag.</h2>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          Nothing was sent or changed. Retry, then use <span className="font-medium text-text-primary">/feedback</span> from Home if the problem returns.
        </p>
        <button
          onClick={reset}
          className="mt-6 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
