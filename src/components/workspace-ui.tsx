import type { ReactNode } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

export function WorkspaceHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-5 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-medium text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1 font-heading text-[32px] font-medium tracking-[-0.02em] text-text-primary">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string | number; detail?: string }> }) {
  return (
    <section aria-label="Key metrics" className="mx-auto grid w-full max-w-[1180px] gap-3 px-5 sm:grid-cols-2 sm:px-8 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-white px-4 py-3.5">
          <p className="text-xs font-medium text-text-secondary">{item.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-semibold tabular-nums text-text-primary">{item.value}</strong>
            {item.detail ? <span className="text-sm text-text-secondary">{item.detail}</span> : null}
          </div>
        </div>
      ))}
    </section>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "border-border bg-surface-soft text-text-secondary",
    info: "border-primary/20 bg-primary-soft text-primary",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
    danger: "border-error/20 bg-error-soft text-error",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
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
    <div className="mx-auto my-6 w-[calc(100%-2.5rem)] max-w-[1130px] rounded-2xl border border-warning/25 bg-warning-soft p-5" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div><h2 className="font-heading text-lg font-semibold text-text-primary">This workspace could not load</h2><p className="mt-1 text-base text-text-secondary">{message}</p><button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-text-primary hover:bg-surface-soft">Retry</button></div>
      </div>
    </div>
  );
}
