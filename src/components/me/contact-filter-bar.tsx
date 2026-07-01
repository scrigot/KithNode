"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

// Reusable search + filter bar. Drives the server query via URL search params, so
// it works on any /me page that reads them (contacts now; network/prep next).
// The text search covers name/firm/title/education (so "UNC" finds your school).
export default function ContactFilterBar({
  industries,
  sources,
  total,
}: {
  industries: string[];
  sources: string[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("contact"); // don't carry an open modal across a filter change
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );

  // Debounce the text search so we're not pushing a route on every keystroke.
  useEffect(() => {
    const cur = params.get("q") ?? "";
    if (q === cur) return;
    const t = setTimeout(() => setParam("q", q), 300);
    return () => clearTimeout(t);
  }, [q, params, setParam]);

  const val = (k: string) => params.get(k) ?? "";
  const active = [q, val("industry"), val("relationshipType"), val("source"), val("inPipeline"), val("actions")].some(Boolean);

  const selectCls =
    "rounded-lg bg-[#232020] border border-[#38332F] px-2.5 py-2 text-[13px] text-[#C9C2BB] outline-none focus:border-[#E8643C]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, company, title, school…"
        className="flex-1 min-w-[220px] rounded-lg bg-[#232020] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
      />
      <select value={val("industry")} onChange={(e) => setParam("industry", e.target.value)} className={selectCls}>
        <option value="">All industries</option>
        {industries.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <select value={val("relationshipType")} onChange={(e) => setParam("relationshipType", e.target.value)} className={selectCls}>
        <option value="">Any type</option>
        <option value="buyer">buyer</option>
        <option value="practitioner">practitioner</option>
        <option value="ecosystem">ecosystem</option>
      </select>
      <select value={val("source")} onChange={(e) => setParam("source", e.target.value)} className={selectCls}>
        <option value="">Any source</option>
        {sources.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={val("inPipeline")} onChange={(e) => setParam("inPipeline", e.target.value)} className={selectCls}>
        <option value="">All</option>
        <option value="in">In a pipeline</option>
        <option value="out">Not in a pipeline</option>
      </select>
      <select value={val("actions")} onChange={(e) => setParam("actions", e.target.value)} className={selectCls}>
        <option value="">Any next steps</option>
        <option value="open">Has next steps</option>
      </select>
      {active && (
        <button onClick={() => router.push(pathname)} className="text-[12px] text-[#8A8077] hover:text-[#E8643C] px-1">
          clear
        </button>
      )}
      <span className="text-[12px] text-[#8A8077] ml-auto">{total} match{total === 1 ? "" : "es"}</span>
    </div>
  );
}
