"use client";

import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/posthog";
import { X, Loader2, Check } from "lucide-react";

interface WarmPath {
  intermediaryName: string;
  intermediaryRelation: string;
  firmName: string;
  title: string;
}

interface IntroModalProps {
  contact: {
    id: string;
    name: string;
    title: string;
    firmName: string;
  };
  warmPath: WarmPath;
  userName: string;
  onClose: () => void;
}

type ModalState = "composing" | "sending" | "success" | "error";

export function IntroModal({
  contact,
  warmPath,
  userName,
  onClose,
}: IntroModalProps) {
  const defaultMessage = `Hi ${warmPath.intermediaryName}, I'm ${userName} at UNC. I noticed you might know ${contact.name} at ${contact.firmName}. Would you be willing to make an introduction? I'm currently recruiting for ${contact.firmName.includes("Capital") || contact.firmName.includes("Partners") || contact.firmName.includes("Advisors") ? "finance" : "industry"} roles and would love to learn more about their experience.`;

  const [message, setMessage] = useState(defaultMessage);
  const [state, setState] = useState<ModalState>("composing");
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-close on success
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => onClose(), 2000);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  // Lock body scroll + escape to close
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state === "composing") {
        trackEvent("intro_request_abandoned", {
          target_contact_id: contact.id,
          intermediary: warmPath.intermediaryName,
        });
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [state, contact.id, warmPath.intermediaryName, onClose]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    setState("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intermediaryName: warmPath.intermediaryName,
          targetContactId: contact.id,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setState("success");
      trackEvent("intro_request_sent", {
        target_contact_id: contact.id,
        intermediary: warmPath.intermediaryName,
        has_email: false,
      });
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send. Try again.",
      );
    }
  }, [message, warmPath.intermediaryName, contact.id]);

  const handleClose = () => {
    if (state === "composing") {
      trackEvent("intro_request_abandoned", {
        target_contact_id: contact.id,
        intermediary: warmPath.intermediaryName,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-modal-title"
    >
      <div className="w-full max-w-lg border border-primary/30 bg-card shadow-2xl shadow-primary/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h3
            id="intro-modal-title"
            className="text-[11px] font-bold uppercase tracking-wider text-primary"
          >
            ASK FOR INTRO
          </h3>
          <button
            onClick={handleClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warm path chain */}
        <div className="border-b border-white/[0.06] px-5 py-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            WARM PATH
          </span>
          <p className="mt-1 font-mono text-[11px]">
            <span className="text-muted-foreground">You </span>
            <span className="text-muted-foreground">{"->"} </span>
            <span className="text-primary">{warmPath.intermediaryName}</span>
            <span className="text-muted-foreground">
              {" "}
              ({warmPath.intermediaryRelation})
            </span>
            <span className="text-muted-foreground"> {"->"} </span>
            <span className="text-primary">{contact.name}</span>
            <span className="text-muted-foreground">
              {" "}
              ({contact.title} at {contact.firmName})
            </span>
          </p>
        </div>

        {/* Success state */}
        {state === "success" && (
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            <div className="flex h-12 w-12 items-center justify-center border border-green-500/30 bg-green-500/10">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-sm font-bold text-foreground">
              Intro request sent to {warmPath.intermediaryName}
            </p>
          </div>
        )}

        {/* Composing / Sending / Error states */}
        {state !== "success" && (
          <>
            <div className="space-y-4 px-5 py-4">
              {/* Asking / Meeting labels */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    ASKING
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-foreground">
                    {warmPath.intermediaryName}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    TO MEET
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-foreground">
                    {contact.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {contact.title} at {contact.firmName}
                  </p>
                </div>
              </div>

              {/* Not on KithNode notice */}
              <div className="border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-[10px] text-amber-400">
                  {warmPath.intermediaryName} isn't on KithNode yet. We'll send
                  them an email with your intro request and an invite to join.
                </p>
              </div>

              {/* Message textarea */}
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  YOUR MESSAGE
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={state === "sending"}
                  rows={5}
                  className="mt-1 w-full resize-none border border-white/[0.06] bg-black/40 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Preview */}
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  PREVIEW - WHAT {warmPath.intermediaryName.toUpperCase()} WILL
                  RECEIVE
                </span>
                <div className="mt-1 border border-white/[0.06] bg-black/20 px-3 py-2">
                  <p className="text-[10px] font-bold text-muted-foreground">
                    Subject: KithNode: {userName} wants an intro to{" "}
                    {contact.name} at {contact.firmName}
                  </p>
                  <div className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">
                    <p>
                      Hey {warmPath.intermediaryName.split(" ")[0]}, {userName}{" "}
                      would like you to introduce them to {contact.name} at{" "}
                      {contact.firmName}.
                    </p>
                    <div className="mt-2 border-l-2 border-primary/30 pl-2 text-foreground/70">
                      {message || "(empty message)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {state === "error" && (
                <div className="border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <p className="text-[10px] text-red-400">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 border-t border-white/[0.06] px-5 py-3">
              <button
                onClick={handleClose}
                disabled={state === "sending"}
                className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                CANCEL
              </button>
              {state === "error" ? (
                <button
                  onClick={handleSend}
                  className="flex flex-1 items-center justify-center gap-2 bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
                >
                  RETRY
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={state === "sending" || !message.trim()}
                  className="flex flex-1 items-center justify-center gap-2 bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80 disabled:opacity-50"
                >
                  {state === "sending" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      SENDING...
                    </>
                  ) : (
                    "SEND REQUEST"
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
