"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { CREDIT_COSTS, CREDIT_ALLOTMENTS } from "@/lib/credit-costs";

const FAQS = [
  {
    q: "What do the scores mean?",
    a: `FIT (0–100) measures shared background: school, Greek life, clubs, target firms. KITH is a class above HOT — people you actually know: marked friends, anyone who replied or booked a meeting, or someone you spoke with in the last 30 days.`,
  },
  {
    q: "What do credits cost?",
    a: `Enrich ${CREDIT_COSTS.enrich}/contact · Discover run ${CREDIT_COSTS.discover} · Draft ${CREDIT_COSTS.draft} · Resume parse ${CREDIT_COSTS.resume}. Rescoring is free. Beta codes include ${CREDIT_ALLOTMENTS.betaCode} credits; paid plans refill ${CREDIT_ALLOTMENTS.monthly}/mo.`,
  },
  {
    q: "How does Discover work?",
    a: "Discover finds new contacts matched to your profile. Swipe right to add someone to your network, left to skip. Each run costs credits, so rate the full deck before re-running.",
  },
  {
    q: "How do I add contacts?",
    a: "Import a LinkedIn connections CSV on the Import page, or add people manually from Contacts. The richer your profile (clubs, Greek org, targets), the sharper the warm-path scoring.",
  },
];

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<globalThis.HTMLButtonElement>(null);

  // Escape + outside-click close, same behavior as the top-bar popovers.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: globalThis.MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t))
        return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function send() {
    const text = message.trim();
    if (!text || status === "sending") return;
    setStatus("sending");
    try {
      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, page: pathname }),
      });
      if (!res.ok) throw new Error("send failed");
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* z-40: below the upgrade toast (z-50) and the tour overlay (z-10000) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help and feedback"
        className="fixed bottom-[78px] right-4 z-40 flex h-11 w-11 items-center justify-center border border-white/[0.12] bg-bg-card text-text-muted shadow-lg hover:border-accent-teal/50 hover:text-accent-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:bottom-4"
      >
        {open ? <X size={16} /> : <HelpCircle size={16} />}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-[60px] right-4 z-40 flex max-h-[70vh] w-80 flex-col border border-white/[0.18] bg-bg-secondary shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Help &amp; Feedback
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="text-text-muted hover:text-text-primary"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ─── Quick answers ────────────────────────────────────────── */}
            <div className="px-3 py-2">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                Quick answers
              </p>
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {FAQS.map((f) => (
                  <details key={f.q} className="group py-1.5">
                    <summary className="cursor-pointer list-none text-[11px] font-bold text-text-secondary hover:text-text-primary group-open:text-text-primary">
                      {f.q}
                    </summary>
                    <p className="mt-1 text-[11px] leading-snug text-text-muted">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("kn:start-tour"));
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 border-y border-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/10"
            >
              <RotateCcw size={11} />
              Replay the dashboard tour
            </button>

            {/* ─── Message Sam ──────────────────────────────────────────── */}
            <div className="px-3 py-2">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                Message Sam
              </p>
              {status === "sent" ? (
                <div className="border border-accent-teal/20 bg-accent-teal/5 px-2.5 py-2">
                  <p className="text-[11px] font-bold text-accent-teal">
                    Sent.
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                    Sam reads every message and replies to your email.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-accent-teal"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Question, bug, or idea — goes straight to Sam."
                    disabled={status === "sending"}
                    className="w-full resize-none border border-white/[0.12] bg-bg-primary px-2 py-1.5 text-[12px] text-text-primary placeholder:text-text-muted focus:border-accent-teal/50 focus:outline-none disabled:opacity-50"
                  />
                  {status === "error" && (
                    <p className="mt-1 font-mono text-[10px] text-accent-red">
                      Send failed — try again.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={send}
                    disabled={!message.trim() || status === "sending"}
                    className="mt-1.5 w-full border border-accent-teal/30 bg-accent-teal/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20 disabled:opacity-40"
                  >
                    {status === "sending" ? "Sending…" : "Send to Sam"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
