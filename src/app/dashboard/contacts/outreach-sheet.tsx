"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trackEvent } from "@/lib/posthog";

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
  const [outreachId, setOutreachId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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

      if (!res.ok) throw new Error("Failed to generate draft");

      const data = await res.json();
      setDraft(data.draft);
      setSubject(data.subject);
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
    } catch {
      setError("Could not generate draft. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [contactId, contactName]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && contactId) {
      setDraft("");
      setSubject("");
      setOutreachId(null);
      setStatus(null);
      setCopied(false);
      setError("");
      generateDraft();
    }
    if (!isOpen) {
      if (draft && status !== "sent" && !copied) {
        trackEvent("outreach_draft_abandoned", {
          contact_id: contactId,
          contact_name: contactName,
        });
      }
      onClose();
    }
  };

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

  const mailtoHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`
    : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col border-l border-border bg-background sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-bold uppercase tracking-wider text-primary">
              DRAFT OUTREACH
            </SheetTitle>
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
          </div>
          <p className="text-xs text-muted-foreground">
            {contactName}
            {contactEmail && (
              <span className="ml-2 text-[10px] text-accent-teal">
                {contactEmail}
              </span>
            )}
          </p>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin border-2 border-muted border-t-primary" />
              <p className="mt-3 text-[10px] text-muted-foreground">
                GENERATING WITH CLAUDE...
              </p>
            </div>
          ) : error ? (
            <div className="border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
              {error}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-6 text-[10px]"
                onClick={generateDraft}
              >
                RETRY
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Subject */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  SUBJECT
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="border-border bg-muted font-mono text-xs"
                />
              </div>

              {/* Body */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  MESSAGE
                </label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={14}
                  className="w-full resize-y border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                  {draft.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!loading && !error && draft && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2 py-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-border text-[10px] hover:border-primary hover:text-primary"
                onClick={generateDraft}
              >
                REGENERATE
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-[10px] ${copied ? "border-green-500/30 text-green-400" : "border-border hover:border-accent-teal hover:text-accent-teal"}`}
                onClick={handleCopy}
              >
                {copied ? "COPIED" : "COPY TO CLIPBOARD"}
              </Button>
              <a
                href={mailtoHref}
                className="inline-flex h-7 items-center border border-accent-teal bg-accent-teal/10 px-3 text-[10px] font-medium text-accent-teal hover:bg-accent-teal/20"
              >
                OPEN IN GMAIL
              </a>
              {status !== "sent" && outreachId && (
                <Button
                  size="sm"
                  className="ml-auto h-7 bg-accent-teal text-[10px] text-white hover:bg-accent-teal/80"
                  onClick={handleMarkSent}
                >
                  MARK AS SENT
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
