"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { OpsTile, OpsEmpty } from "./ops-tile";
import { relativeTime } from "./state";

interface FeedbackRow {
  id: string;
  userEmail: string;
  page: string;
  message: string;
  status: string;
  createdAt: string;
}

export function FeedbackPanel() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const fetchList = useCallback(async () => {
    try {
      const r = await apiFetch("/api/feedback");
      if (r.ok) {
        const body = await r.json();
        setRows(body.feedback ?? []);
      }
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  async function toggle(row: FeedbackRow) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const next = row.status === "done" ? "new" : "done";
      const r = await apiFetch("/api/feedback", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id, status: next }),
      });
      if (r.ok) await fetchList();
    } finally {
      setBusyId("");
    }
  }

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <OpsTile
      label="Tester Feedback"
      subtitle="In-app help messages"
      badge={rows.length > 0 ? `${newCount} new` : undefined}
      badgeHealth={newCount > 0 ? "warn" : "neutral"}
    >
      {loading ? (
        <div className="h-8 animate-pulse bg-white/[0.04]" />
      ) : rows.length === 0 ? (
        <OpsEmpty
          icon={<MessageSquare size={20} />}
          heading="No messages yet"
          description="Tester questions from the in-app help widget land here (and in your email)."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["When", "From", "Page", "Message", "Status"].map((h) => (
                  <th
                    key={h}
                    className="pb-1.5 pr-3 text-left font-mono text-[9px] uppercase tracking-wider text-text-muted last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((row) => (
                <tr key={row.id} className={row.status === "done" ? "opacity-50" : ""}>
                  <td className="w-16 py-1.5 pr-3 align-top font-mono text-[10px] text-text-muted">
                    {relativeTime(row.createdAt)}
                  </td>
                  <td className="max-w-[150px] truncate py-1.5 pr-3 align-top font-mono text-accent-teal">
                    {row.userEmail}
                  </td>
                  <td className="max-w-[120px] truncate py-1.5 pr-3 align-top font-mono text-[10px] text-text-muted">
                    {row.page || "—"}
                  </td>
                  <td className="py-1.5 pr-3 align-top">
                    <p className="max-w-[400px] whitespace-pre-wrap break-words leading-snug text-text-primary">
                      {row.message}
                    </p>
                  </td>
                  <td className="py-1.5 align-top">
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      disabled={busyId === row.id}
                      className={`border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider disabled:opacity-40 ${
                        row.status === "done"
                          ? "border-white/[0.12] text-text-muted hover:text-text-primary"
                          : "border-accent-teal/30 bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20"
                      }`}
                    >
                      {row.status === "done" ? "done" : "mark done"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpsTile>
  );
}
