"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, TicketPercent } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { OpsTile } from "./ops-tile";
import { relativeTime } from "./state";

interface PromoCode {
  code: string;
  note: string;
  days: number;
  credits: number;
  redeemedByEmail: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

interface MintedCode {
  code: string;
  days: number;
  credits: number;
  note: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1.5 shrink-0 text-text-muted hover:text-accent-teal"
      aria-label="Copy code"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export function BetaCodesPanel() {
  // ─── Mint form state ───────────────────────────────────────────────────────
  const [count, setCount] = useState("1");
  const [days, setDays] = useState("7");
  const [credits, setCredits] = useState("50");
  const [note, setNote] = useState("");
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<MintedCode[]>([]);
  const [mintError, setMintError] = useState("");

  // ─── Redemption list state ─────────────────────────────────────────────────
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const r = await apiFetch("/api/ops/promo");
      if (r.ok) {
        const body = await r.json();
        setCodes(body.codes ?? []);
      }
    } catch {
      // keep stale
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  async function handleMint() {
    setMintError("");
    const n = parseInt(count, 10);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      setMintError("count must be 1–200");
      return;
    }
    setMinting(true);
    try {
      const r = await apiFetch("/api/ops/promo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          count: n,
          days: parseInt(days, 10) || 7,
          credits: parseInt(credits, 10) || 50,
          note,
        }),
      });
      const body = await r.json();
      if (!r.ok) {
        setMintError(body.error ?? "Mint failed");
        return;
      }
      setMinted(body.codes ?? []);
      await fetchList();
    } catch {
      setMintError("Network error");
    } finally {
      setMinting(false);
    }
  }

  return (
    <OpsTile
      label="Beta Codes"
      subtitle="Mint · redemptions"
      badge={codes.length > 0 ? `${codes.filter((c) => c.redeemedByEmail).length}/${codes.length} used` : undefined}
      badgeHealth="neutral"
    >
      {/* ─── Mint form ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="col-span-1 flex flex-col gap-0.5">
          <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
            Count
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            disabled={minting}
            className="border border-white/[0.12] bg-bg-primary px-2 py-1 font-mono text-[11px] text-text-primary focus:border-accent-teal/50 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="col-span-1 flex flex-col gap-0.5">
          <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
            Days
          </label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={minting}
            className="border border-white/[0.12] bg-bg-primary px-2 py-1 font-mono text-[11px] text-text-primary focus:border-accent-teal/50 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="col-span-1 flex flex-col gap-0.5">
          <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
            Credits
          </label>
          <input
            type="number"
            min={0}
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            disabled={minting}
            className="border border-white/[0.12] bg-bg-primary px-2 py-1 font-mono text-[11px] text-text-primary focus:border-accent-teal/50 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="col-span-1 flex flex-col gap-0.5">
          <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
            &nbsp;
          </label>
          <button
            type="button"
            onClick={handleMint}
            disabled={minting}
            className="flex items-center justify-center gap-1 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20 disabled:opacity-40"
          >
            {minting ? "..." : "Mint"}
          </button>
        </div>
      </div>
      <div className="mt-1.5">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          disabled={minting}
          className="w-full border border-white/[0.12] bg-bg-primary px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted focus:border-accent-teal/50 focus:outline-none disabled:opacity-50"
        />
      </div>
      {mintError && (
        <p className="mt-1 font-mono text-[10px] text-accent-red">{mintError}</p>
      )}

      {/* ─── Freshly minted codes ───────────────────────────────────────── */}
      {minted.length > 0 && (
        <div className="mt-3 border border-accent-teal/20 bg-accent-teal/5 px-3 py-2">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-accent-teal">
            Generated — {minted.length} code{minted.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {minted.map((c) => (
              <span
                key={c.code}
                className="flex items-center border border-accent-teal/30 bg-bg-primary px-2 py-px font-mono text-[11px] font-bold text-accent-teal"
              >
                {c.code}
                <CopyButton text={c.code} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Redemption table ───────────────────────────────────────────── */}
      <div className="mt-4 h-px bg-border" />
      <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-text-muted">
        Redemptions
      </p>
      {listLoading ? (
        <div className="mt-2 h-8 animate-pulse bg-white/[0.04]" />
      ) : codes.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-1.5 py-4 text-center">
          <TicketPercent size={18} className="text-text-muted" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            No codes yet
          </p>
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Code", "Note", "Days · Cr", "Redeemed by", "When"].map((h) => (
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
              {codes.map((c) => (
                <tr key={c.code} className="group">
                  <td className="py-1.5 pr-3">
                    <span className="flex items-center font-mono font-bold text-text-primary">
                      {c.code}
                      <CopyButton text={c.code} />
                    </span>
                  </td>
                  <td className="max-w-[120px] truncate py-1.5 pr-3 text-text-muted">
                    {c.note || "—"}
                  </td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-text-secondary">
                    {c.days}d · {c.credits}cr
                  </td>
                  <td className="py-1.5 pr-3">
                    {c.redeemedByEmail ? (
                      <span className="max-w-[140px] truncate font-mono text-accent-teal">
                        {c.redeemedByEmail}
                      </span>
                    ) : (
                      <span className="border border-white/[0.12] px-1.5 py-px text-[9px] uppercase tracking-wider text-text-muted">
                        unused
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 font-mono text-[10px] text-text-muted">
                    {c.redeemedAt ? relativeTime(c.redeemedAt) : "—"}
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
