"use client";

// Modified from DeepTutor's centered chat/composer interaction pattern.
// KithNode's skills, evidence, approvals, persistence, and tools are original.

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, AtSign, Bot, BriefcaseBusiness, CheckCircle2, Copy, ExternalLink, Link2, Loader2, MessageSquarePlus, Paperclip, Save, Search, Send, Sparkles, Square, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
}

interface ProposedAction {
  id: string;
  toolName: string;
  riskLevel: string;
  input: { label?: string; [key: string]: unknown };
  status: string;
  output?: {
    actionId?: string;
    opportunityId?: string;
    message?: string;
    undone?: boolean;
    [key: string]: unknown;
  };
}

interface CareerSkill {
  id: string;
  command: string;
  label: string;
  description: string;
}

interface SkillCard {
  id: string;
  title: string;
  subtitle?: string;
  score?: number;
  confidence: number;
  evidence: string[];
  sourceDate: string;
  warning?: string;
  links?: Array<{ label: string; href: string }>;
  data?: {
    opportunity?: Record<string, unknown>;
    programType?: string;
    season?: string;
    classYearStatus?: string;
    relationshipState?: "verified" | "potential" | "none" | "unavailable";
    relationships?: Array<{
      contactId: string;
      name: string;
      state: "verified" | "potential";
      summary: string;
    }>;
  };
}

interface SkillResult {
  skillId: string;
  title: string;
  summary: string;
  cards: SkillCard[];
  warnings: string[];
  freshness: string;
  status?: "complete" | "partial" | "needs_setup";
  sourceStatus?: Array<{
    company: string;
    state: "ready" | "needs_setup" | "failed";
    provider?: string;
    careerUrl?: string;
    detail?: string;
  }>;
  setup?: {
    kind: "job_sources";
    unresolvedFirms: string[];
    suggestedFirms: string[];
    searchConfigured: boolean;
    parameters: Record<string, unknown>;
  };
}

interface IssueSnapshot {
  code: string;
  message: string;
  details: string[];
  occurredAt: string;
}

type ContextSource = {
  id: string;
  label: string;
  description: string;
};

const CONTEXT_SOURCES: ContextSource[] = [
  { id: "people", label: "People", description: "Relationships, context, and warm paths" },
  { id: "companies", label: "Companies", description: "Organizations, coverage, and recruiting activity" },
  { id: "applications", label: "Applications", description: "Deadlines, stages, next actions, and materials" },
  { id: "documents", label: "Documents", description: "Resumes, LinkedIn, essays, and approved evidence" },
  { id: "memory", label: "Memory", description: "Approved goals, preferences, and timeline facts" },
  { id: "knowledge", label: "Knowledge Center", description: "All grounded sources and provenance" },
];

const FEEDBACK_REPORT_LIMIT = 1_900;

function boundedText(value: unknown, limit = 320) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function buildFeedbackReport(input: {
  id: string;
  note: string;
  page: string;
  conversationId?: string;
  issue?: IssueSnapshot;
  skillResult?: SkillResult;
  messages: Message[];
}) {
  const failedSources = input.skillResult?.sourceStatus
    ?.filter((source) => source.state !== "ready")
    .map((source) => `${source.company}: ${boundedText(source.detail || source.state, 180)}`) || [];
  const recentMessages = input.messages.slice(-4).map((message) =>
    `${message.role}: ${boundedText(message.content, 260)}`,
  );
  const lines = [
    "KITHNODE COPILOT FEEDBACK",
    `Report: ${input.id}`,
    `Time: ${new Date().toISOString()}`,
    `Page: ${input.page}`,
    `Conversation: ${input.conversationId || "none"}`,
    input.note ? `User note: ${boundedText(input.note, 400)}` : "User note: none",
    input.issue ? `Latest issue: [${input.issue.code}] ${boundedText(input.issue.message, 500)}` : "Latest issue: none recorded",
    ...(input.issue?.details || []).slice(0, 5).map((detail) => `Issue detail: ${boundedText(detail, 220)}`),
    input.skillResult ? `Skill: ${input.skillResult.skillId} (${input.skillResult.status || "unknown"})` : "Skill: none",
    ...failedSources.slice(0, 5).map((source) => `Source: ${source}`),
    ...recentMessages.map((message) => `Recent: ${message}`),
  ];
  const report = lines.join("\n");
  return report.length > FEEDBACK_REPORT_LIMIT ? `${report.slice(0, FEEDBACK_REPORT_LIMIT - 1)}…` : report;
}

async function responseBody(response: Response, onStatus?: (message: string) => void) {
  if (response.headers.get("content-type")?.includes("application/x-ndjson") && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let finalData: Record<string, unknown> = {};
    while (true) {
      const { value, done } = await reader.read();
      buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffered.split("\n");
      buffered = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as { type?: string; message?: string; status?: number; data?: Record<string, unknown> };
        if (event.type === "status" && event.message) onStatus?.(event.message);
        if (event.type === "result" && event.data) finalData = event.data;
        if (event.type === "error") {
          throw Object.assign(
            new Error(String(event.data?.message || event.data?.error || `Assistant request failed (${event.status || 500})`)),
            { code: String(event.data?.code || `http_${event.status || 500}`) },
          );
        }
      }
      if (done) break;
    }
    return finalData;
  }
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: `Server returned a non-JSON response (${response.status})` };
  }
}

function actionPreview(action: ProposedAction) {
  const fields = ["subject", "body", "message", "draft", "content"];
  return fields
    .map((key) => typeof action.input[key] === "string" && action.input[key] ? `${key === "subject" ? "Subject: " : ""}${action.input[key]}` : "")
    .filter(Boolean)
    .join("\n\n");
}

export function CareerCopilotWorkspace({
  userName = "there",
}: {
  userName?: string;
}) {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState<CareerSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>();
  const [skillResult, setSkillResult] = useState<SkillResult>();
  const [skillIndex, setSkillIndex] = useState(0);
  const [cardBusy, setCardBusy] = useState<string>();
  const [progress, setProgress] = useState("");
  const [sourceUrls, setSourceUrls] = useState<Record<string, string>>({});
  const [lastIssue, setLastIssue] = useState<IssueSnapshot>();
  const [feedbackPacket, setFeedbackPacket] = useState("");
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [preselectedSkill, setPreselectedSkill] = useState<CareerSkill>();
  const [attachedSources, setAttachedSources] = useState<ContextSource[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; type: string }>>([]);
  const [contextOpen, setContextOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function recordIssue(caught: unknown, fallback: string, code = "client_error") {
    const message = boundedText(caught instanceof Error ? caught.message : fallback, 500) || fallback;
    const caughtCode = caught && typeof caught === "object" && "code" in caught
      ? boundedText((caught as { code?: unknown }).code, 80)
      : code;
    setError(message);
    setLastIssue({ code: caughtCode || code, message, details: [], occurredAt: new Date().toISOString() });
    return message;
  }

  useEffect(() => {
    apiFetch("/api/assistant/skills")
      .then(async (response) => ({ response, data: await responseBody(response) }))
      .then(({ response, data }) => {
        if (response.ok && Array.isArray(data.skills)) setSkills(data.skills as CareerSkill[]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedConversation = new URLSearchParams(window.location.search).get("conversationId");
    if (!requestedConversation || requestedConversation === conversationId || loading) return;

    let cancelled = false;
    setLoading(true);
    setProgress("Opening conversation…");
    apiFetch(`/api/assistant/chat?conversationId=${encodeURIComponent(requestedConversation)}`)
      .then(async (response) => ({ response, data: await responseBody(response) }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(String(data.error || "Could not load conversation"));
        const history = Array.isArray(data.messages)
          ? data.messages as Array<{ role?: unknown; content?: unknown }>
          : [];
        setConversationId(requestedConversation);
        setMessages(
          history
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({
              role: message.role as Message["role"],
              content: String(message.content || ""),
            })),
        );
        const toolCalls = Array.isArray(data.toolCalls)
          ? data.toolCalls as Array<Record<string, unknown>>
          : [];
        setActions(
          toolCalls.map((item) => ({
            id: String(item.id),
            toolName: String(item.toolName),
            riskLevel: String(item.riskLevel),
            input: (item.input && typeof item.input === "object" ? item.input : {}) as ProposedAction["input"],
            status: String(item.status || "proposed"),
            output: item.output && typeof item.output === "object" ? item.output as ProposedAction["output"] : undefined,
          })),
        );
      })
      .catch((caught) => {
        if (!cancelled) recordIssue(caught, "Could not load conversation", "history_load_failed");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setProgress("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, loading]);

  useEffect(() => {
    if (!skills.length || typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("skill")?.replace(/^\//, "");
    if (!requested) return;
    const skill = skills.find((item) => item.id.replaceAll("_", "-") === requested || item.command.slice(1) === requested);
    if (!skill) return;
    setInput(`${skill.command} `);
    setSelectedSkillId(skill.id);
    setPreselectedSkill(skill);
  }, [skills]);

  const visibleSkills = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const query = input.slice(1).toLowerCase().trim();
    return skills.filter((skill) => !query || `${skill.command} ${skill.label} ${skill.description}`.toLowerCase().includes(query)).slice(0, 12);
  }, [input, skills]);

  function newConversation() {
    setConversationId(undefined);
    setMessages([]);
    setRecommendations([]);
    setActions([]);
    setError("");
    setSkillResult(undefined);
    setFeedbackPacket("");
    setFeedbackCopied(false);
  }

  function chooseSkill(skill: CareerSkill) {
    setInput(`${skill.command} `);
    setSelectedSkillId(skill.id);
    setSkillIndex(0);
  }

  function inputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void runAssistant(input.trim());
      return;
    }
    if (visibleSkills.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSkillIndex((current) => (current + 1) % visibleSkills.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSkillIndex((current) => (current - 1 + visibleSkills.length) % visibleSkills.length);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chooseSkill(visibleSkills[skillIndex] || visibleSkills[0]);
    } else if (event.key === "Escape") {
      setInput("");
      setSelectedSkillId(undefined);
    }
  }

  function attachSource(source: ContextSource) {
    setAttachedSources((current) => current.some((item) => item.id === source.id) ? current : [...current, source]);
    setContextOpen(false);
  }

  async function decide(action: ProposedAction, decision: "approve" | "deny") {
    setCardBusy(`action:${action.id}`);
    setError("");
    try {
      const response = await apiFetch("/api/assistant/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolCallId: action.id, decision }),
      });
      const data = await responseBody(response);
      if (!response.ok) throw new Error(String(data.message || data.error || "Could not record decision"));
      setActions((current) => current.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: String(data.status),
              output: data.output && typeof data.output === "object"
                ? data.output as ProposedAction["output"]
                : item.output,
            }
          : item,
      ));
    } catch (caught) {
      recordIssue(caught, "Could not record decision", "approval_failed");
    } finally {
      setCardBusy(undefined);
    }
  }

  async function undoAction(action: ProposedAction) {
    const actionId = action.output?.actionId;
    if (!actionId) return;
    setCardBusy(`action:${action.id}`);
    setError("");
    try {
      const response = await apiFetch(`/api/assistant/actions/${encodeURIComponent(actionId)}/undo`, {
        method: "POST",
      });
      const data = await responseBody(response);
      if (!response.ok) throw new Error(String(data.message || data.error || "Could not undo this change"));
      setActions((current) => current.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: String(data.status || "undone"),
              output: data.output && typeof data.output === "object"
                ? data.output as ProposedAction["output"]
                : item.output,
            }
          : item,
      ));
    } catch (caught) {
      recordIssue(caught, "Could not undo this change", "undo_failed");
    } finally {
      setCardBusy(undefined);
    }
  }

  async function copyFeedbackReport(report = feedbackPacket) {
    if (!report || !navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(report);
      setFeedbackCopied(true);
      return true;
    } catch {
      setFeedbackCopied(false);
      return false;
    }
  }

  async function submitFeedback(command: string) {
    const note = command.replace(/^\/feedback\b/i, "").trim();
    const reportId = `KN-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const report = buildFeedbackReport({
      id: reportId,
      note,
      page: window.location.pathname,
      conversationId,
      issue: lastIssue,
      skillResult,
      messages,
    });
    setInput("");
    setSelectedSkillId(undefined);
    setFeedbackPacket(report);
    setFeedbackCopied(false);
    setMessages((current) => [...current, { role: "user", content: command }]);

    // Clipboard access is most reliable while slash-command submission is
    // still the active user gesture. Logging and founder alerts happen next.
    const copied = await copyFeedbackReport(report);
    try {
      const response = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: report, page: window.location.pathname }),
      });
      const data = await responseBody(response);
      if (!response.ok) {
        throw Object.assign(new Error(String(data.error || "Feedback could not be logged")), { code: "feedback_send_failed" });
      }
      setError("");
      setMessages((current) => [...current, {
        role: "assistant",
        content: `${reportId} was logged and sent to the KithNode feedback inbox.${copied ? " The safe report is copied for Codex." : " Use Copy for Codex below to copy the safe report."}`,
      }]);
    } catch (caught) {
      recordIssue(caught, "Feedback could not be logged. The report is still ready to copy.", "feedback_send_failed");
      setMessages((current) => [...current, {
        role: "assistant",
        content: `${reportId} could not be sent, but the safe report is preserved below${copied ? " and copied for Codex" : ""}.`,
      }]);
    }
  }

  async function runAssistant(message: string, requestedSkillId = selectedSkillId, parameters?: Record<string, unknown>) {
    if (!message || loading) return;
    if (/^\/feedback(?:\s|$)/i.test(message)) {
      await submitFeedback(message);
      return;
    }
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    setProgress("Starting Career Copilot…");
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await apiFetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({
          message,
          conversationId,
          skillId: requestedSkillId,
          parameters: {
            ...(parameters || {}),
            contextSources: attachedSources.map((source) => source.id),
            files: attachedFiles,
          },
        }),
        signal: controller.signal,
      });
      const data = await responseBody(response, setProgress);
      if (!response.ok) {
        throw Object.assign(new Error(String(data.error || "Assistant request failed")), { code: String(data.code || `http_${response.status}`) });
      }
      setConversationId(String(data.conversationId));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: String((data.message as { content?: unknown })?.content || "") },
      ]);
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations as Recommendation[] : []);
      setActions(Array.isArray(data.proposedActions) ? data.proposedActions as ProposedAction[] : []);
      const nextSkillResult = data.skillResult && typeof data.skillResult === "object" ? data.skillResult as SkillResult : undefined;
      setSkillResult(nextSkillResult);
      const failedSources = nextSkillResult?.sourceStatus?.filter((source) => source.state === "failed") || [];
      if ((nextSkillResult?.warnings.length || 0) > 0 || failedSources.length > 0) {
        setLastIssue({
          code: "skill_partial",
          message: boundedText(nextSkillResult?.warnings[0] || `${failedSources.length} job source${failedSources.length === 1 ? "" : "s"} failed`, 500),
          details: [
            ...(nextSkillResult?.warnings || []),
            ...failedSources.map((source) => `${source.company}: ${source.detail || "Source failed"}`),
          ].map((detail) => boundedText(detail, 220)).slice(0, 5),
          occurredAt: new Date().toISOString(),
        });
      }
      setSelectedSkillId(undefined);
      setAttachedSources([]);
      setAttachedFiles([]);
      if (data.degraded) setError("The planning model was unavailable; no action was taken.");
    } catch (caught) {
      if (caught instanceof globalThis.DOMException && caught.name === "AbortError") {
        setError("Generation stopped. Your prompt and conversation are preserved.");
      } else {
        recordIssue(caught, "Assistant request failed", "assistant_request_failed");
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setProgress("");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAssistant(input.trim());
  }

  async function searchSuggestedFirm(company: string) {
    const internshipMode = skillResult?.skillId === "find_internships";
    const command = internshipMode ? "/find-internships" : "/find-jobs";
    await runAssistant(`${command} ${company}`, internshipMode ? "find_internships" : "find_jobs", { companies: [company], includeAdjacent: false });
  }

  async function saveSourceAndRetry(company: string) {
    const careerUrl = sourceUrls[company]?.trim();
    if (!careerUrl || cardBusy) return;
    setCardBusy(`source:${company}`);
    setError("");
    try {
      const response = await apiFetch("/api/job-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, careerUrl }),
      });
      const data = await responseBody(response);
      if (!response.ok) throw new Error(String(data.error || "Could not save the official careers page"));
      const sourceId = String((data.source as { id?: unknown })?.id || "");
      if (sourceId) {
        const testResponse = await apiFetch(`/api/job-sources/${encodeURIComponent(sourceId)}/test`, { method: "POST" });
        const tested = await responseBody(testResponse);
        if (!testResponse.ok) throw new Error(String(tested.error || "The careers page could not be verified"));
      }
      const retryParameters = { ...(skillResult?.setup?.parameters || {}), companies: [company], includeAdjacent: false };
      setSourceUrls((current) => ({ ...current, [company]: "" }));
      setCardBusy(undefined);
      const internshipMode = skillResult?.skillId === "find_internships";
      const command = internshipMode ? "/find-internships" : "/find-jobs";
      await runAssistant(`${command} ${company}`, internshipMode ? "find_internships" : "find_jobs", retryParameters);
    } catch (caught) {
      recordIssue(caught, "Could not save the official careers page", "job_source_save_failed");
    } finally {
      setCardBusy(undefined);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[840px] flex-col px-5 pb-10 pt-4 sm:px-8">
      <section className="flex min-h-[calc(100vh-2rem)] min-w-0 flex-1 flex-col">
        <header className="flex min-h-11 items-center justify-between border-b border-border-soft pb-3">
          <div>
            <p className="text-sm font-medium text-text-secondary">
              {conversationId ? "Conversation" : "New conversation"}
            </p>
            {preselectedSkill ? (
              <p className="mt-1 text-xs text-text-secondary">
                <span className="font-semibold text-primary">{preselectedSkill.command}</span>{" "}
                {preselectedSkill.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={newConversation}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-text-primary hover:bg-surface-soft"
          >
            <MessageSquarePlus size={15} />
            New
          </button>
        </header>

        <div className={`flex-1 space-y-5 py-8 ${messages.length === 0 ? "flex flex-col justify-center" : ""}`}>
          {messages.length === 0 && (
            <div className="mx-auto w-full max-w-[790px]">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white text-primary shadow-sm">
                  <Sparkles size={20} />
                </div>
                <h1 className="font-heading text-[34px] font-medium leading-tight tracking-[-0.02em] text-text-primary sm:text-[42px]">
                  What should we work on, {userName}?
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-6 text-text-secondary">
                  KithNode remembers your recruiting goals, applications, relationships, and evidence.
                  Ask naturally, use a skill, or attach a record for context.
                </p>
              </div>
              <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {[
                  "Find internships that fit my experience",
                  "Who should I contact this week?",
                  "What is blocking my recruiting plan?",
                  "Help me tailor a resume for an application",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="min-h-12 rounded-xl border border-border bg-white px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-7 ${
                message.role === "user"
                  ? "ml-auto bg-primary-soft text-text-primary"
                  : "border border-border-soft bg-white text-text-primary"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                {message.role === "assistant" ? <Bot size={11} /> : null}
                {message.role === "assistant" ? "KithNode" : "You"}
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="animate-spin" size={14} /> {progress || "Building a grounded plan…"}
            </div>
          )}
          {skillResult && (
            <div className="space-y-4 border-t border-border-soft pt-5">
              <div>
                <h2 className="font-heading text-2xl font-medium text-text-primary">{skillResult.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(skillResult.freshness).toLocaleString()}</p>
              </div>
              {skillResult.warnings.map((warning, index) => <p key={`${index}-${warning.slice(0, 40)}`} className="border border-accent-amber/20 bg-accent-amber/5 p-2 text-xs text-accent-amber">{boundedText(warning, 320)}</p>)}
              {skillResult.sourceStatus?.length ? (
                <div className="flex flex-wrap gap-2" aria-label="Job source status">
                  {skillResult.sourceStatus.map((source) => (
                    <span key={`${source.company}-${source.state}`} title={source.detail} className={`inline-flex min-h-8 items-center gap-1.5 border px-2.5 text-xs ${source.state === "ready" ? "border-accent-green/25 bg-accent-green/5 text-accent-green" : source.state === "failed" ? "border-accent-red/25 bg-accent-red/5 text-accent-red" : "border-accent-amber/25 bg-accent-amber/5 text-accent-amber"}`}>
                      {source.state === "ready" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {source.company}{source.detail ? ` · ${boundedText(source.detail, 180)}` : ""}
                    </span>
                  ))}
                </div>
              ) : null}
              {skillResult.setup?.kind === "job_sources" ? (
                <section className="border border-primary/25 bg-primary/[0.04] p-4" aria-labelledby="job-source-setup-title">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 border border-primary/25 bg-primary/10 p-2 text-primary"><Search size={16} /></div>
                    <div className="min-w-0 flex-1">
                      <h3 id="job-source-setup-title" className="text-sm font-semibold text-text-primary">Choose an official place to search</h3>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">Known employers connect automatically. For another firm, paste its official careers or ATS page—never a job aggregator.</p>
                    </div>
                  </div>
                  {skillResult.setup.suggestedFirms.length ? <div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Verified suggestions</p><div className="mt-2 flex flex-wrap gap-2">{skillResult.setup.suggestedFirms.map((company) => <button key={company} type="button" disabled={loading} onClick={() => searchSuggestedFirm(company)} className="min-h-11 border border-border bg-white px-3 text-left text-xs font-semibold text-text-primary hover:border-primary/50 disabled:opacity-50">{company}<span className="ml-2 text-primary">Search →</span></button>)}</div></div> : null}
                  {skillResult.setup.unresolvedFirms.length ? <div className="mt-4 space-y-3"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Needs an official careers page</p>{skillResult.setup.unresolvedFirms.map((company) => <div key={company} className="grid gap-2 border-t border-border-soft pt-3 sm:grid-cols-[minmax(8rem,0.35fr)_minmax(0,1fr)_auto]"><label className="self-center text-sm font-medium text-text-primary" htmlFor={`source-${company}`}>{company}</label><div className="relative"><Link2 className="absolute left-3 top-3.5 text-muted-foreground" size={14} /><input id={`source-${company}`} type="url" inputMode="url" value={sourceUrls[company] || ""} onChange={(event) => setSourceUrls((current) => ({ ...current, [company]: event.target.value }))} placeholder="https://company.com/careers" className="min-h-11 w-full border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary/60" /></div><button type="button" disabled={!sourceUrls[company]?.trim() || Boolean(cardBusy) || loading} onClick={() => saveSourceAndRetry(company)} className="min-h-11 bg-primary px-4 text-xs font-bold text-white disabled:opacity-40">{cardBusy === `source:${company}` ? <Loader2 className="mx-auto animate-spin" size={15} /> : "Verify & search"}</button></div>)}</div> : null}
                  <p className="mt-4 text-[11px] text-muted-foreground">{skillResult.setup.searchConfigured ? "Automatic source discovery is available for custom firms." : "Search connector is optional; verified catalog sources and manual official URLs work without it."}</p>
                </section>
              ) : null}
              <div className="grid gap-3">
                {skillResult.cards.map((card) => {
                  const saveAction = actions.find((action) =>
                    action.toolName === "save_opportunity"
                    && String(action.input.candidateId || "") === card.id,
                  );
                  const actionBusy = saveAction ? cardBusy === `action:${saveAction.id}` : false;
                  const relationshipState = card.data?.relationshipState;
                  const savedOpportunityId = saveAction?.output?.opportunityId;
                  return (
                    <article key={card.id} className="rounded-2xl border border-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="text-sm font-semibold">{card.title}</h3>{card.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>}</div>
                        {typeof card.score === "number" && <span className="rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{card.score}/100</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {card.data?.programType ? <span className="rounded-lg border border-primary/25 bg-primary/[0.06] px-2 py-1 text-[10px] font-medium text-primary">{card.data.programType.replaceAll("_", " ")}</span> : null}
                        {card.data?.season ? <span className="rounded-lg border border-border px-2 py-1 text-[10px] text-text-secondary">{card.data.season}</span> : null}
                        {card.data?.classYearStatus ? <span className="rounded-lg border border-border px-2 py-1 text-[10px] text-text-secondary">Eligibility {card.data.classYearStatus}</span> : null}
                        {relationshipState ? (
                          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${
                            relationshipState === "verified"
                              ? "border-success/25 bg-success-soft text-success"
                              : relationshipState === "potential"
                                ? "border-warning/25 bg-warning-soft text-warning"
                                : "border-border bg-surface-soft text-text-secondary"
                          }`}>
                            {relationshipState === "verified" ? "Verified warm path" : relationshipState === "potential" ? "Potential path" : "No known path"}
                          </span>
                        ) : null}
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-text-secondary">{card.evidence.map((item) => <li key={item}>• {item}</li>)}</ul>
                      {card.data?.relationships?.length ? (
                        <div className="mt-3 rounded-xl border border-border-soft bg-surface-soft px-3 py-2 text-xs text-text-secondary">
                          <p className="font-medium text-text-primary">Relationship evidence</p>
                          {card.data.relationships.slice(0, 3).map((relationship) => (
                            <p key={`${card.id}:${relationship.contactId}`} className="mt-1">
                              {relationship.name}: {relationship.summary}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {card.warning && <p className="mt-2 text-xs text-warning">{card.warning}</p>}
                      {saveAction?.status === "proposed" || saveAction?.status === "undone" ? (
                        <p className="mt-3 text-xs leading-5 text-text-secondary">
                          Saving creates one Applications record. It does not apply, message anyone, or generate a resume.
                        </p>
                      ) : null}
                      {saveAction?.output?.message ? (
                        <p className="mt-3 rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-xs text-success" role="status">
                          {saveAction.output.message}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.links?.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs text-primary"><ExternalLink size={12} />{link.label}</a>)}
                        {saveAction && ["proposed", "undone"].includes(saveAction.status) ? (
                          <button type="button" disabled={actionBusy} onClick={() => decide(saveAction, "approve")} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50">
                            {actionBusy ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                            {saveAction.status === "undone" ? "Save again" : "Save to Applications"}
                          </button>
                        ) : null}
                        {saveAction?.status === "completed" && savedOpportunityId ? (
                          <>
                            <a href={`/dashboard/resume?opportunityId=${encodeURIComponent(savedOpportunityId)}`} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-soft px-3 text-xs font-semibold text-primary">
                              <BriefcaseBusiness size={13} />Tailor resume
                            </a>
                            {saveAction.output?.undoAvailable !== false ? (
                              <button type="button" disabled={actionBusy} onClick={() => undoAction(saveAction)} className="min-h-10 rounded-lg border border-border bg-white px-3 text-xs font-medium text-text-secondary disabled:opacity-50">
                                {actionBusy ? "Undoing…" : "Undo save"}
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {saveAction?.status === "denied" ? <span className="self-center text-xs text-text-secondary">Save dismissed</span> : null}
                        {card.data?.opportunity && !saveAction ? <span className="self-center text-xs text-warning">Save preview unavailable—rerun this search.</span> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
          {recommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">{recommendation.title}</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{recommendation.rationale}</p>
                </div>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  {Math.round(recommendation.confidence * 100)}%
                </span>
              </div>
            </article>
          ))}
          {actions.filter((action) => action.toolName !== "save_opportunity" || !action.input.candidateId).map((action) => (
            <article key={action.id} className="rounded-2xl border border-warning/25 bg-warning-soft p-4">
              <p className="text-xs font-semibold text-warning">Review before anything changes</p>
              <h3 className="mt-1 font-medium text-text-primary">{action.input?.label || action.toolName}</h3>
              {actionPreview(action) ? (
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-white p-3 text-sm leading-6 text-text-secondary">
                  {actionPreview(action)}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                {action.toolName === "update_goal"
                  ? "Approval records this goal. Nothing changes before you approve."
                  : action.toolName === "enrich_contacts"
                    ? "Approval may spend the displayed enrichment credits for only the listed people."
                    : action.toolName === "save_opportunity"
                      ? "Approval saves this record to Applications. It does not apply or contact anyone."
                      : "This is a preview. KithNode will not run the action without your approval."}
              </p>
              {action.status === "proposed" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {["update_goal", "enrich_contacts", "save_opportunity"].includes(action.toolName) ? (
                    <button
                      type="button"
                      onClick={() => decide(action, "approve")}
                      className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => decide(action, "deny")}
                    className="min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-secondary"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold capitalize text-text-secondary">{action.status}</p>
                  {action.status === "completed" && action.output?.actionId ? (
                    <button type="button" disabled={cardBusy === `action:${action.id}`} onClick={() => undoAction(action)} className="min-h-10 rounded-lg border border-border bg-white px-3 text-xs font-medium text-text-secondary disabled:opacity-50">
                      Undo
                    </button>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>

        <form onSubmit={submit} className="sticky bottom-4 z-10 mt-auto">
          <div className="relative rounded-[24px] border border-border bg-white p-3 shadow-[0_14px_45px_rgba(23,23,23,0.10)]">
            {visibleSkills.length > 0 && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(36rem,calc(100vw-3rem))] rounded-2xl border border-border bg-white p-1.5 shadow-xl">
                {visibleSkills.map((skill, index) => (
                  <button key={skill.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSkill(skill)} className={`block w-full rounded-xl px-3 py-2.5 text-left ${index === skillIndex ? "bg-primary-soft" : "hover:bg-surface-soft"}`}>
                    <span className="text-xs font-semibold text-primary">{skill.command}</span>
                    <span className="ml-2 text-xs font-medium">{skill.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{skill.description}</span>
                  </button>
                ))}
              </div>
            )}
            {contextOpen ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(32rem,calc(100vw-3rem))] rounded-2xl border border-border bg-white p-1.5 shadow-xl">
                <p className="px-3 py-2 text-xs font-medium text-text-secondary">Attach grounded context</p>
                {CONTEXT_SOURCES.map((source) => (
                  <button key={source.id} type="button" onClick={() => attachSource(source)} className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-surface-soft">
                    <span className="text-sm font-medium text-text-primary">@{source.label}</span>
                    <span className="mt-0.5 block text-xs text-text-secondary">{source.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {attachedSources.length || attachedFiles.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                {attachedSources.map((source) => <span key={source.id} className="inline-flex min-h-8 items-center rounded-lg border border-primary/20 bg-primary-soft px-2.5 text-xs font-medium text-primary">@{source.label}<button type="button" onClick={() => setAttachedSources((current) => current.filter((item) => item.id !== source.id))} className="ml-1.5 rounded p-0.5" aria-label={`Remove ${source.label}`}><X size={12} /></button></span>)}
                {attachedFiles.map((file) => <span key={`${file.name}:${file.size}`} className="inline-flex min-h-8 items-center rounded-lg border border-border bg-surface-soft px-2.5 text-xs font-medium text-text-secondary">{file.name}<button type="button" onClick={() => setAttachedFiles((current) => current.filter((item) => item !== file))} className="ml-1.5 rounded p-0.5" aria-label={`Remove ${file.name}`}><X size={12} /></button></span>)}
              </div>
            ) : null}
            <textarea
              value={input}
              onChange={(event) => { const value = event.target.value; setInput(value); if (!value.startsWith("/")) setSelectedSkillId(undefined); setSkillIndex(0); if (/(^|\s)@$/.test(value)) setContextOpen(true); }}
              onKeyDown={inputKeyDown}
              placeholder="Ask what to do next, or type / for skills…"
              rows={3}
              className="min-h-[76px] w-full resize-none bg-transparent px-2 py-1 text-[16px] leading-6 text-text-primary outline-none placeholder:text-text-faint"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <button
                  type="button"
                  onClick={() => setInput((current) => current.startsWith("/") ? current : `/${current}`)}
                  className="min-h-9 rounded-lg px-2.5 hover:bg-surface-selected"
                >
                  / Skills
                </button>
                <button type="button" onClick={() => setContextOpen((current) => !current)} className="min-h-9 rounded-lg px-2.5 hover:bg-surface-selected"><AtSign className="mr-1 inline h-4 w-4" />Context</button>
                <label className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 hover:bg-surface-selected"><Paperclip className="mr-1 h-4 w-4" />Files<input type="file" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files || []).slice(0, 5).map((file) => ({ name: file.name, size: file.size, type: file.type })); setAttachedFiles((current) => [...current, ...files].slice(0, 5)); event.target.value = ""; }} /></label>
                <span className="hidden sm:inline">⌘ Enter to send</span>
              </div>
              {loading ? <button type="button" onClick={() => abortRef.current?.abort()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-text-primary text-white" aria-label="Stop generation"><Square size={15} fill="currentColor" /></button> : <button type="submit" disabled={!input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-opacity disabled:opacity-35" aria-label="Send"><Send size={17} /></button>}
            </div>
          </div>
          {feedbackPacket && (
            <div className="mt-2 flex items-center justify-between gap-3 border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-text-secondary">
              <span>{feedbackCopied ? "Feedback report copied for Codex." : "Feedback report ready to copy for Codex."}</span>
              <button type="button" onClick={() => void copyFeedbackReport()} className="inline-flex min-h-9 items-center gap-1.5 border border-primary/30 px-3 font-semibold text-primary hover:bg-primary/10">
                {feedbackCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                {feedbackCopied ? "Copied" : "Copy for Codex"}
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-2 rounded-xl border border-warning/25 bg-warning-soft px-3 py-2 text-sm text-warning">
              {error}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
