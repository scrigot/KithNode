"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
      <div className="max-w-md border border-white/10 bg-[#111D2E] p-8 text-center">
        <h2 className="mb-2 font-mono text-lg text-white">Something went wrong</h2>
        <p className="mb-6 text-sm text-white/50">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="border border-white/20 bg-white/5 px-4 py-2 font-mono text-sm text-white hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
