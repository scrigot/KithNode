"use client";

import { useEffect, useState } from "react";

export function CopyRefButton() {
  const [link, setLink] = useState("https://kithnode.vercel.app/?ref=alpha");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const base = window.location.origin;
      const slug = Math.random().toString(36).slice(2, 8);
      setLink(`${base}/?ref=${slug}`);
    }
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="flex-1 truncate rounded-md bg-black/20 px-3 py-2 font-mono text-xs text-white/90">
        {link}
      </code>
      <button
        onClick={copy}
        className="rounded-md bg-white/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/30"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
