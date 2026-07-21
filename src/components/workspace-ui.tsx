import type { ReactNode } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

export function WorkspaceHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/[0.08] bg-bg-secondary px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div className="min-w-0">
        {eyebrow ? <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent-teal">{eyebrow}</p> : null}
        <h1 className="mt-1 font-heading text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-base leading-6 text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string | number; detail?: string }> }) {
  return (
    <section aria-label="Key metrics" className="grid border-b border-white/[0.08] bg-card sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border-b border-white/[0.08] px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">{item.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="font-mono text-2xl tabular-nums text-text-primary">{item.value}</strong>
            {item.detail ? <span className="text-sm text-text-secondary">{item.detail}</span> : null}
          </div>
        </div>
      ))}
    </section>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "border-white/[0.12] bg-white/[0.04] text-text-secondary",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    danger: "border-red-400/30 bg-red-400/10 text-red-300",
  };
  return <span className={`inline-flex border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}>{children}</span>;
}

export function WorkspaceLoading({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-6" role="status">
      <div className="flex items-center gap-3 text-base text-text-secondary"><LoaderCircle className="h-5 w-5 animate-spin text-accent-teal" />{label}</div>
    </div>
  );
}

export function WorkspaceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="m-4 border border-amber-400/30 bg-amber-400/[0.08] p-5 sm:m-6" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div><h2 className="font-heading text-lg font-semibold text-text-primary">This workspace could not load</h2><p className="mt-1 text-base text-text-secondary">{message}</p><button type="button" onClick={onRetry} className="mt-4 min-h-11 border border-white/[0.16] px-4 text-sm font-bold text-text-primary hover:bg-white/[0.06]">Retry</button></div>
      </div>
    </div>
  );
}
