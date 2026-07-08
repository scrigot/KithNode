"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// One-click: drop a ranked contact into the AI Consulting pipeline.
export default function AddToAiConsulting({
  contactId,
  pipelineId,
}: {
  contactId: string;
  pipelineId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);

  if (!pipelineId) return null;

  return (
    <button
      disabled={pending || added}
      onClick={() =>
        start(async () => {
          await fetch("/api/me/pipelines/entry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pipelineId, contactId }),
          });
          setAdded(true);
          router.refresh();
        })
      }
      className="shrink-0 text-[11px] rounded-md border border-[#38332F] px-2 py-1 text-[#C9C2BB] hover:border-[#E8643C] hover:text-[#E8643C] disabled:opacity-50 transition-colors"
    >
      {added ? "added ✓" : pending ? "…" : "+ AI Consulting"}
    </button>
  );
}
