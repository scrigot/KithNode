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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-white to-[#F1F5F9] px-6">
      <div className="max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
