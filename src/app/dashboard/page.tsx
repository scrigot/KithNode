import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-text-primary">Overview</h2>
      <p className="mt-1 text-xs text-text-muted">
        Your networking intelligence hub
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/contacts"
          className="rounded-lg border border-border bg-bg-card p-5 transition-colors hover:border-accent-green"
        >
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Warm Signals
          </p>
          <p className="mt-2 text-2xl font-bold text-accent-green">&gt;</p>
          <p className="mt-1 text-xs text-text-secondary">
            Ranked connections by priority score
          </p>
        </Link>

        <Link
          href="/dashboard/discover"
          className="rounded-lg border border-border bg-bg-card p-5 transition-colors hover:border-accent-amber"
        >
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Discover
          </p>
          <p className="mt-2 text-2xl font-bold text-accent-amber">*</p>
          <p className="mt-1 text-xs text-text-secondary">
            Train your algorithm by rating contacts
          </p>
        </Link>

        <Link
          href="/dashboard/import"
          className="rounded-lg border border-border bg-bg-card p-5 transition-colors hover:border-accent-blue"
        >
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Import
          </p>
          <p className="mt-2 text-2xl font-bold text-accent-blue">+</p>
          <p className="mt-1 text-xs text-text-secondary">
            Add LinkedIn profiles to your pipeline
          </p>
        </Link>
      </div>
    </div>
  );
}
