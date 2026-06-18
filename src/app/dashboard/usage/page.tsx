"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface UsageEvent {
  userEmail: string;
  action: string;
  credits: number;
  costUsd: number;
  createdAt: string;
  meta: Record<string, unknown> | null;
}

interface CreditsData {
  balance: number;
  tutorialDoneAt: string | null;
  recent: UsageEvent[];
}

const ACTION_LABELS: Record<string, string> = {
  enrich: "Enrich",
  discover: "Discover",
  draft: "Draft",
  resume: "Resume",
};

export default function UsagePage() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/user/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalSpent = data?.recent.reduce((sum, e) => sum + (e.credits ?? 0), 0) ?? 0;

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-4 border-b border-white/[0.06] pb-4">
        <h1 className="text-[20px] font-bold text-white">Credits & Usage</h1>
        <p className="mt-0.5 text-[12px] text-text-muted">
          Your current balance and recent credit activity.
        </p>
      </div>

      {loading && (
        <p className="text-[12px] text-text-muted">Loading...</p>
      )}

      {!loading && data && (
        <>
          {/* Balance summary */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="border border-white/[0.06] bg-card px-5 py-4">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Current Balance
              </p>
              <p className="text-[24px] font-bold tabular-nums text-accent-teal">
                {data.balance}
                <span className="ml-1 text-[12px] text-text-muted">cr</span>
              </p>
            </div>
            <div className="border border-white/[0.06] bg-card px-5 py-4">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Used (last 50)
              </p>
              <p className="text-[24px] font-bold tabular-nums text-white">
                {totalSpent}
                <span className="ml-1 text-[12px] text-text-muted">cr</span>
              </p>
            </div>
            <div className="border border-white/[0.06] bg-card px-5 py-4">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Actions (last 50)
              </p>
              <p className="text-[24px] font-bold tabular-nums text-white">
                {data.recent.length}
              </p>
            </div>
            <div className="border border-white/[0.06] bg-card px-5 py-4">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Monthly Allotment
              </p>
              <p className="text-[24px] font-bold tabular-nums text-white">
                200
                <span className="ml-1 text-[12px] text-text-muted">cr</span>
              </p>
            </div>
          </div>

          {/* Credit bar */}
          <div className="mb-4 border border-white/[0.06] bg-card px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Balance vs. Allotment
              </p>
              <span className="text-[11px] tabular-nums text-text-muted">
                {data.balance} / 200
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.06]">
              <div
                className="h-1.5 bg-accent-teal/70 transition-all duration-300"
                style={{ width: `${Math.min(100, (data.balance / 200) * 100)}%` }}
              />
            </div>
          </div>

          {/* Event table */}
          <div className="border border-white/[0.06] bg-card">
            <div className="border-b border-white/[0.06] px-5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Recent Activity
              </p>
            </div>
            {data.recent.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-text-muted">
                No usage events yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-5 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Action
                    </th>
                    <th className="px-5 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Credits
                    </th>
                    <th className="px-5 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Cost (USD)
                    </th>
                    <th className="px-5 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((event, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      <td className="px-5 py-2.5 text-[12px] text-white">
                        {ACTION_LABELS[event.action] ?? event.action}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[12px] tabular-nums text-accent-teal">
                        -{event.credits}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[12px] tabular-nums text-text-muted">
                        {event.costUsd > 0 ? `$${event.costUsd.toFixed(4)}` : "--"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[11px] tabular-nums text-text-muted">
                        {new Date(event.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!loading && !data && (
        <p className="text-[12px] text-red-400">Failed to load usage data.</p>
      )}
    </div>
  );
}
