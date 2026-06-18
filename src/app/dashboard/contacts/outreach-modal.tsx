"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mail, Pencil, Wand2, Sparkles, X } from "lucide-react";
import { trackEvent } from "@/lib/posthog";
import {
  highlightSignals,
  buildOutlookComposeUrl,
  buildGmailComposeUrl,
} from "@/lib/outreach-highlight";

interface OutreachModalProps {
  connectionId: string;
  contactName: string;
  open: boolean;
  onClose: () => void;
}

// The in-app "Draft Outreach" popup — the real version of the landing demo.
// Dark dashboard chrome (brand/dashboard.md), the real /api/outreach/draft, the
// shared/mutual signals highlighted in teal, and Outlook / Gmail web-compose
// hand-off. Drop-in replacement for OutreachSlideOver (same props).
export function OutreachModal({
  connectionId,
  contactName,
  open,
  onClose,
}: OutreachModalProps) {
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [signals, setSignals] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const sentRef = useRef(false);

  const generate = useCallback(
    (regen: boolean) => {
      setLoading(true);
      setError("");
      if (!regen) {
        setDraft("");
        setSubject("");
        setSignals([]);
        setRecipientEmail("");
        setEditing(false);
      }
      fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to generate draft");
          return res.json();
        })
        .then((data) => {
          setDraft(data.draft ?? "");
          setSubject(data.subject ?? "");
          setSignals(Array.isArray(data.signals) ? data.signals : []);
          setRecipientEmail(data.recipientEmail ?? "");
          trackEvent(regen ? "outreach_regenerated" : "outreach_drafted", {
            connection_id: connectionId,
            contact_name: contactName,
          });
          if (!regen) {
            trackEvent("outreach_draft_generated", {
              connection_id: connectionId,
              contact_name: contactName,
            });
          }
        })
        .catch(() => setError("Could not generate draft. Please try again."))
        .finally(() => setLoading(false));
    },
    [connectionId, contactName],
  );

  useEffect(() => {
    if (!open) return;
    sentRef.current = false;
    generate(false);
  }, [open, generate]);

  const handleClose = () => {
    if (draft && !sentRef.current) {
      trackEvent("outreach_draft_abandoned", {
        connection_id: connectionId,
        contact_name: contactName,
      });
    }
    sentRef.current = false;
    onClose();
  };

  const onSend = (method: "outlook" | "gmail") => {
    sentRef.current = true;
    trackEvent("outreach_sent", {
      connection_id: connectionId,
      contact_name: contactName,
    });
    trackEvent("outreach_draft_sent", {
      connection_id: connectionId,
      contact_name: contactName,
      method,
    });
  };

  if (!open) return null;

  const compose = { to: recipientEmail, subject, body: draft };
  const segments = highlightSignals(draft, signals);

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
            {recipientEmail && (
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {recipientEmail}
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
            <div className="flex items-center justify-center py-12">
              <div
                className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-primary"
                data-testid="loading-spinner"
              />
            </div>
          ) : error ? (
            <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
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
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-bg-primary px-4 py-3">
            <a
              href={buildOutlookComposeUrl(compose)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSend("outlook")}
              className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white"
            >
              <Mail className="h-3 w-3" />
              Open in Outlook
            </a>
            <a
              href={buildGmailComposeUrl(compose)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSend("gmail")}
              className="inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground"
            >
              <Mail className="h-3 w-3" />
              Open in Gmail
            </a>
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
              onClick={() => generate(true)}
              className="ml-auto inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              title="Generates a fresh draft (uses 1 credit)"
            >
              <Wand2 className="h-3 w-3" />
              Regen with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
