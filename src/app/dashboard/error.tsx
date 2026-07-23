"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-canvas px-6">
      <div className="max-w-md rounded-2xl border border-border-soft bg-white p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-error">Workspace interrupted</p>
        <h2 className="mt-3 font-heading text-3xl font-semibold text-text-primary">Your work is still here.</h2>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          KithNode could not finish loading this workspace. Retry the request; drafts and approved records are not changed.
        </p>
        <button
          onClick={reset}
          className="mt-6 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Retry workspace
        </button>
        {error.digest ? <p className="mt-4 text-xs text-text-faint">Reference {error.digest}</p> : null}
      </div>
    </div>
  );
}
