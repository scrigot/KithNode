"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Mail, Pencil, Wand2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";
import {
  highlightSignals,
  buildOutlookComposeUrl,
  buildGmailComposeUrl,
} from "@/lib/outreach-highlight";

interface OutreachSheetProps {
  contactId: string | null;
  contactName: string;
  contactEmail?: string;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (contactId: string, status: string) => void;
}

export function OutreachSheet({
  contactId,
  contactName,
  contactEmail,
  open,
  onClose,
  onStatusChange,
}: OutreachSheetProps) {
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [signals, setSignals] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [outreachId, setOutreachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const generateDraft = useCallback(async () => {
    if (!contactId) return;

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const res = await fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error("402");
        }
        throw new Error(`Failed to generate draft (HTTP ${res.status})`);
      }

      const data = await res.json();
      setDraft(data.draft);
      setSubject(data.subject);
      setSignals(Array.isArray(data.signals) ? data.signals : []);
      setRecipientEmail(data.recipientEmail ?? "");
      setOutreachId(data.outreachId);
      setStatus("drafted");
      trackEvent("outreach_drafted", {
        contact_id: contactId,
        contact_name: contactName,
      });
      trackEvent("outreach_draft_generated", {
        contact_id: contactId,
        contact_name: contactName,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg === "402"
          ? "Drafting is a Pro feature. Upgrade to use it."
          : "Could not generate and save the draft. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }, [contactId, contactName]);

  // Track which contactId we last triggered generation for so we don't fire
  // twice when `open` and `contactId` both change in the same render.
  const lastGeneratedRef = useRef<string | null>(null);

  // Fire generation whenever the modal opens programmatically via the `open`
  // prop. Callers open it by setting a state variable, so we generate on the
  // first render where `open` and `contactId` are both set.
  useEffect(() => {
    if (!open || !contactId) return;
    if (lastGeneratedRef.current === contactId) return;
    lastGeneratedRef.current = contactId;
    setDraft("");
    setSubject("");
    setSignals([]);
    setRecipientEmail("");
    setOutreachId(null);
    setStatus(null);
    setCopied(false);
    setEditing(false);
    setError("");
    generateDraft();
  }, [open, contactId, generateDraft]);

  const handleClose = useCallback(() => {
    if (draft && status !== "sent" && !copied) {
      trackEvent("outreach_draft_abandoned", {
        contact_id: contactId,
        contact_name: contactName,
      });
    }
    onClose();
  }, [draft, status, copied, contactId, contactName, onClose]);

  // Escape closes the modal (preserves the slide-over's Esc-to-close).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleCopy = async () => {
    const text = `Subject: ${subject}\n\n${draft}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    trackEvent("outreach_copied", {
      contact_id: contactId,
      contact_name: contactName,
    });
    trackEvent("outreach_draft_sent", {
      contact_id: contactId,
      contact_name: contactName,
      method: "copy",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompose = (method: "outlook" | "gmail") => {
    trackEvent("outreach_draft_sent", {
      contact_id: contactId,
      contact_name: contactName,
      method,
    });
  };

  const handleMarkSent = async () => {
    if (!outreachId) return;

    try {
      const res = await fetch(`/api/contacts/${outreachId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });

      if (res.ok) {
        setStatus("sent");
        trackEvent("outreach_sent", {
          contact_id: contactId,
          contact_name: contactName,
        });
        trackEvent("outreach_draft_sent", {
          contact_id: contactId,
          contact_name: contactName,
          method: "mark_sent",
        });
        onStatusChange?.(contactId!, "sent");
      }
    } catch {
      // silently fail
    }
  };

  if (!open) return null;

  const to = recipientEmail || contactEmail || "";
  const compose = { to, subject, body: draft };
  const segments = highlightSignals(draft, signals);
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        data-testid="outreach-modal-backdrop"
      />

      <div className="relative flex max-h-[90vh] w-[min(94%,40rem)] flex-col border border-primary/30 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
              Draft Outreach
            </span>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <Badge
                variant="outline"
                className={
                  status === "sent"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                }
              >
                {status.toUpperCase()}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              {loading ? "AI Drafting..." : "AI Drafted"}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Recipient + subject */}
        <div className="space-y-2.5 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              To
            </span>
            <span className="inline-flex items-center gap-1.5 border border-white/[0.08] bg-bg-card px-2 py-0.5 text-[12px] text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              {contactName}
            </span>
            {to && (
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {to}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-white/[0.08] bg-bg-primary px-2 py-1 text-[13px] text-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="min-h-[180px] flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-primary"
                data-testid="loading-spinner"
              />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Generating with Claude...
              </p>
            </div>
          ) : error ? (
            <div className="border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
              {error}
              <button
                type="button"
                onClick={generateDraft}
                className="mt-2 block border border-destructive/30 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
              >
                Retry
              </button>
            </div>
          ) : editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              className="w-full resize-y border border-white/[0.08] bg-bg-primary px-3 py-2 text-[13px] leading-relaxed text-foreground focus:border-primary/50 focus:outline-none"
              data-testid="draft-textarea"
            />
          ) : (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {segments.map((seg, i) =>
                seg.signal ? (
                  <span key={i} className="bg-primary/20 px-0.5 text-primary">
                    {seg.text}
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </p>
          )}
          {!loading && !error && draft && (
            <p className="mt-2 font-mono text-[10px] tabular-nums text-muted-foreground">
              {wordCount} words
            </p>
          )}
        </div>

        {/* Legend */}
        {!loading && !error && signals.length > 0 && (
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2.5">
            <span className="h-2 w-2 bg-primary/20" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Mutual signals, highlighted for relevance
            </span>
          </div>
        )}

        {/* Actions */}
        {!loading && !error && draft && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-bg-primary px-4 py-3">
            <a
              href={buildOutlookComposeUrl(compose)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCompose("outlook")}
              className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white"
            >
              <Mail className="h-3 w-3" />
              Open in Outlook
            </a>
            <a
              href={buildGmailComposeUrl(compose)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCompose("gmail")}
              className="inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground"
            >
              <Mail className="h-3 w-3" />
              Open in Gmail
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                copied
                  ? "border-green-500/30 text-green-400"
                  : "border-white/[0.12] text-muted-foreground"
              }`}
            >
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              <Pencil className="h-3 w-3" />
              {editing ? "Done" : "Edit"}
            </button>
            <button
              type="button"
              onClick={generateDraft}
              className="ml-auto inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              title="Generates a fresh draft (uses 1 credit)"
            >
              <Wand2 className="h-3 w-3" />
              Regenerate
            </button>
            {status !== "sent" && outreachId && (
              <button
                type="button"
                onClick={handleMarkSent}
                className="inline-flex items-center gap-1.5 bg-accent-teal px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80"
              >
                Mark as Sent
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
