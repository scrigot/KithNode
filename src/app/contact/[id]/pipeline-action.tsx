"use client";

import Link from "next/link";
import { Check, ChevronDown, GitBranch, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/posthog";

interface PipelineChoice {
  id: string;
  name: string;
  kind: string;
  firstStage: string;
}

interface PipelineMembership {
  id: string;
  pipelineId: string;
  stage: string;
}

interface PipelineStatus {
  pipelines: PipelineChoice[];
  membership: PipelineMembership | null;
}

function pipelineHref(pipelineId: string) {
  return `/dashboard/pipeline?pipeline=${encodeURIComponent(pipelineId)}`;
}

export function PipelineAction({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/pipeline/${encodeURIComponent(contactId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("pipeline_status_failed");
        const next = (await response.json()) as PipelineStatus;
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setError("Pipeline status is unavailable. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  useEffect(() => {
    if (!open) return;
    const close = (event: globalThis.MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function addToPipeline(pipeline: PipelineChoice) {
    if (pendingId) return;
    setPendingId(pipeline.id);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/pipeline/${encodeURIComponent(contactId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineId: pipeline.id }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "pipeline_add_failed",
        );
      }
      setStatus((current) =>
        current
          ? {
              ...current,
              membership: {
                id: String(body.pipeline_id || ""),
                pipelineId: pipeline.id,
                stage: String(body.stage || pipeline.firstStage),
              },
            }
          : current,
      );
      setOpen(false);
      trackEvent("pipeline_added", {
        contact_id: contactId,
        name: contactName,
        pipeline_id: pipeline.id,
        source: "contact_profile",
      });
    } catch {
      setError("Could not add this person. Nothing was changed.");
    } finally {
      setPendingId(null);
    }
  }

  if (!status && !error) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        aria-label="Loading pipeline status"
        className="inline-flex items-center gap-2 text-xs"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        PIPELINE
      </Button>
    );
  }

  if (status?.membership?.pipelineId) {
    const pipeline = status.pipelines.find(
      (item) => item.id === status.membership?.pipelineId,
    );
    return (
      <div className="flex flex-col items-end gap-1">
        <Link
          href={pipelineHref(status.membership.pipelineId)}
          className={buttonVariants({
            variant: "outline",
            className:
              "inline-flex items-center gap-2 border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200",
          })}
        >
          <Check className="h-3.5 w-3.5" />
          VIEW IN {pipeline?.name?.toUpperCase() || "PIPELINE"}
        </Link>
        <span className="text-[10px] text-muted-foreground">
          Stage: {status.membership.stage.replaceAll("_", " ")}
        </span>
      </div>
    );
  }

  if (status && status.pipelines.length === 0) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link
          href="/dashboard/pipeline"
          className={buttonVariants({
            variant: "outline",
            className: "inline-flex items-center gap-2 text-xs text-primary",
          })}
        >
          <Plus className="h-3.5 w-3.5" />
          CREATE A PIPELINE
        </Link>
        <span className="text-[10px] text-muted-foreground">
          Create a workflow before adding contacts.
        </span>
      </div>
    );
  }

  const pipelines = status?.pipelines || [];
  const onePipeline = pipelines.length === 1 ? pipelines[0] : null;

  return (
    <div ref={menuRef} className="relative flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={!!pendingId || !status}
        aria-expanded={onePipeline ? undefined : open}
        aria-haspopup={onePipeline ? undefined : "menu"}
        className="inline-flex items-center gap-2 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
        onClick={() => {
          if (onePipeline) void addToPipeline(onePipeline);
          else setOpen((value) => !value);
        }}
      >
        {pendingId ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <GitBranch className="h-3.5 w-3.5" />
        )}
        {pendingId ? "ADDING…" : "ADD TO PIPELINE"}
        {!onePipeline && <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {error && (
        <span role="alert" className="max-w-64 text-right text-[10px] text-red-400">
          {error}
        </span>
      )}

      {open && pipelines.length > 1 && (
        <div
          role="menu"
          aria-label="Choose a pipeline"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-64 border border-white/[0.12] bg-card p-1.5 shadow-2xl"
        >
          <div className="border-b border-white/[0.08] px-2 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Choose a pipeline
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {contactName} starts in that workflow&apos;s first stage.
            </p>
          </div>
          <div className="mt-1 space-y-1">
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                type="button"
                role="menuitem"
                disabled={!!pendingId}
                onClick={() => void addToPipeline(pipeline)}
                className="flex min-h-11 w-full items-center justify-between border border-transparent px-2.5 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none disabled:opacity-50"
              >
                <span>
                  <span className="block text-xs font-semibold text-foreground">
                    {pipeline.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    {pipeline.kind || "Relationship"} · {pipeline.firstStage.replaceAll("_", " ")}
                  </span>
                </span>
                {pendingId === pipeline.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
