import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";

export function WorkspaceContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-5 pb-16 sm:px-8 ${className}`}>{children}</div>;
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-heading text-2xl font-medium tracking-[-0.01em] text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
      />
    </label>
  );
}

export function EmptyWorkspace({
  icon,
  title,
  description,
  action,
  secondary,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-soft text-text-secondary">{icon}</div>
        <h2 className="mt-4 font-heading text-2xl font-medium text-text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{action}{secondary}</div>
      </div>
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
      {children}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Link>
  );
}

export function QuietButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-text-primary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function RecordTable({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-white"><div className="overflow-x-auto">{children}</div></div>;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium text-text-secondary">{children}</span>;
}

