"use client";

import { useState } from "react";
import Link from "next/link";
import OpenContact from "./open-contact";

export default function ActionItemCard({
  contactId,
  name,
  subtitle,
  item,
}: {
  contactId: string;
  name: string;
  subtitle: string;
  item: string;
}) {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  if (done) return null;

  async function complete() {
    setSaving(true);
    const res = await fetch(`/api/me/contacts/${contactId}/action-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: item }),
    });
    setSaving(false);
    if (res.ok) setDone(true);
  }

  return (
    <div className="rounded-lg border border-[#322E2B] bg-[#1C1A19] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <OpenContact id={contactId} tab="memory" className="truncate text-left text-[13px] font-medium text-white hover:text-[#E8643C]">
            {name}
          </OpenContact>
          <p className="mt-0.5 truncate text-[11px] text-[#8A8077]">{subtitle || "Contact"}</p>
        </div>
        <button
          onClick={complete}
          disabled={saving}
          className="shrink-0 rounded-md border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB] hover:border-[#7FB069] hover:text-[#A9D19A] disabled:opacity-50"
        >
          {saving ? "..." : "Done"}
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[#E7E1DB]">{item}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <OpenContact id={contactId} tab="actions" className="rounded-md border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
          Actions
        </OpenContact>
        <Link href={`/me/prep/${contactId}`} className="rounded-md border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
          Prep
        </Link>
      </div>
    </div>
  );
}
