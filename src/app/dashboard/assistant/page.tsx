"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bot, BriefcaseBusiness, ExternalLink, History, Loader2, MessageSquarePlus, Save, Send, ShieldCheck, Sparkles } from "lucide-react";
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
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
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
  data?: { opportunity?: Record<string, unknown> };
}

interface SkillResult {
  skillId: string;
  title: string;
  summary: string;
  cards: SkillCard[];
  warnings: string[];
  freshness: string;
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
        if (event.type === "error") throw new Error(String(event.data?.message || event.data?.error || `Assistant request failed (${event.status || 500})`));
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

export default function AssistantPage() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [skills, setSkills] = useState<CareerSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>();
  const [skillResult, setSkillResult] = useState<SkillResult>();
  const [skillIndex, setSkillIndex] = useState(0);
  const [cardBusy, setCardBusy] = useState<string>();
  const [progress, setProgress] = useState("");

  const loadConversations = useCallback(async () => {
    const response = await apiFetch("/api/assistant/chat");
    const data = await responseBody(response);
    if (!response.ok) throw new Error(String(data.error || "Could not load conversations"));
    setConversations(Array.isArray(data.conversations) ? data.conversations as Conversation[] : []);
  }, []);

  useEffect(() => {
    loadConversations().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load conversations");
    });
  }, [loadConversations]);

  useEffect(() => {
    apiFetch("/api/assistant/skills")
      .then(async (response) => ({ response, data: await responseBody(response) }))
      .then(({ response, data }) => {
        if (response.ok && Array.isArray(data.skills)) setSkills(data.skills as CareerSkill[]);
      })
      .catch(() => undefined);
  }, []);

  const visibleSkills = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const query = input.slice(1).toLowerCase().trim();
    return skills.filter((skill) => !query || `${skill.command} ${skill.label} ${skill.description}`.toLowerCase().includes(query)).slice(0, 9);
  }, [input, skills]);

  async function openConversation(id: string) {
    if (historyBusy || loading) return;
    setHistoryBusy(true);
    setError("");
    try {
      const response = await apiFetch(`/api/assistant/chat?conversationId=${encodeURIComponent(id)}`);
      const data = await responseBody(response);
      if (!response.ok) throw new Error(String(data.error || "Could not load conversation"));
      const history = Array.isArray(data.messages) ? data.messages as Array<{ role?: unknown; content?: unknown }> : [];
      setConversationId(id);
      setMessages(history
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role as Message["role"], content: String(message.content || "") })));
      const toolCalls = Array.isArray(data.toolCalls) ? data.toolCalls as Array<Record<string, unknown>> : [];
      setActions(toolCalls.map((item) => ({
        id: String(item.id),
        toolName: String(item.toolName),
        riskLevel: String(item.riskLevel),
        input: (item.input && typeof item.input === "object" ? item.input : {}) as ProposedAction["input"],
        status: String(item.status || "proposed"),
      })));
      setRecommendations([]);
      setSkillResult(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load conversation");
    } finally {
      setHistoryBusy(false);
    }
  }

  function newConversation() {
    setConversationId(undefined);
    setMessages([]);
    setRecommendations([]);
    setActions([]);
    setError("");
    setSkillResult(undefined);
  }

  function chooseSkill(skill: CareerSkill) {
    setInput(`${skill.command} `);
    setSelectedSkillId(skill.id);
    setSkillIndex(0);
  }

  function inputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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

  async function saveOpportunity(card: SkillCard, tailor = false) {
    if (!card.data?.opportunity || cardBusy) return;
    setCardBusy(card.id);
    setError("");
    try {
      const saveResponse = await apiFetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card.data.opportunity) });
      const saved = await responseBody(saveResponse);
      if (!saveResponse.ok) throw new Error(String(saved.error || "Could not save opportunity"));
      if (tailor) {
        const resumeResponse = await apiFetch(`/api/opportunities/${encodeURIComponent(String((saved.opportunity as { id?: unknown })?.id))}/resume`, { method: "POST" });
        const resume = await responseBody(resumeResponse);
        if (!resumeResponse.ok) throw new Error(String(resume.error || "Could not prepare resume variant"));
      }
      setError(tailor ? "Resume variant prepared in Resume Studio." : "Opportunity saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save opportunity");
    } finally {
      setCardBusy(undefined);
    }
  }

  async function decide(action: ProposedAction, decision: "approve" | "deny") {
    setError("");
    try {
      const response = await apiFetch("/api/assistant/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolCallId: action.id, decision }),
      });
      const data = await responseBody(response);
      if (!response.ok) throw new Error(String(data.error || "Could not record decision"));
      setActions((current) => current.map((item) =>
        item.id === action.id ? { ...item, status: String(data.status) } : item,
      ));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record decision");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    setProgress("Starting Career Copilot…");
    setError("");
    try {
      const response = await apiFetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ message, conversationId, skillId: selectedSkillId }),
      });
      const data = await responseBody(response, setProgress);
      if (!response.ok) throw new Error(String(data.error || "Assistant request failed"));
      setConversationId(String(data.conversationId));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: String((data.message as { content?: unknown })?.content || "") },
      ]);
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations as Recommendation[] : []);
      setActions(Array.isArray(data.proposedActions) ? data.proposedActions as ProposedAction[] : []);
      setSkillResult(data.skillResult && typeof data.skillResult === "object" ? data.skillResult as SkillResult : undefined);
      setSelectedSkillId(undefined);
      if (data.degraded) setError("The planning model was unavailable; no action was taken.");
      await loadConversations();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assistant request failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl gap-4 p-5">
      <section className="flex min-w-0 flex-1 flex-col border border-white/[0.08] bg-card">
        <header className="border-b border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={16} />
            <h1 className="text-sm font-bold uppercase tracking-wider">Career Copilot</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Grounded in your goals, relationships, pipeline, and outcomes. Proposed actions always require approval.
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="border border-primary/20 bg-primary/5 p-4 text-sm text-text-secondary">
              Try: “Who should I contact today?”, “What is blocking my recruiting pipeline?”, or “Make a plan for this week.”
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] border p-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "ml-auto border-primary/30 bg-primary/10"
                  : "border-white/[0.08] bg-background"
              }`}
            >
              <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {message.role === "assistant" ? <Bot size={11} /> : null}
                {message.role}
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
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-primary">{skillResult.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(skillResult.freshness).toLocaleString()}</p>
              </div>
              {skillResult.warnings.map((warning) => <p key={warning} className="border border-accent-amber/20 bg-accent-amber/5 p-2 text-xs text-accent-amber">{warning}</p>)}
              <div className="grid gap-3 xl:grid-cols-2">
                {skillResult.cards.map((card) => (
                  <article key={card.id} className="border border-white/[0.1] bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="text-sm font-semibold">{card.title}</h3>{card.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>}</div>
                      {typeof card.score === "number" && <span className="bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{card.score}/100</span>}
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-text-secondary">{card.evidence.map((item) => <li key={item}>• {item}</li>)}</ul>
                    {card.warning && <p className="mt-2 text-xs text-accent-amber">{card.warning}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.links?.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 border border-white/10 px-2 py-1 text-[11px] text-primary"><ExternalLink size={11} />{link.label}</a>)}
                      {card.data?.opportunity && <button type="button" disabled={cardBusy === card.id} onClick={() => saveOpportunity(card)} className="flex items-center gap-1 border border-white/10 px-2 py-1 text-[11px]"><Save size={11} />Save</button>}
                      {card.data?.opportunity && <button type="button" disabled={cardBusy === card.id} onClick={() => saveOpportunity(card, true)} className="flex items-center gap-1 bg-primary px-2 py-1 text-[11px] text-white"><BriefcaseBusiness size={11} />Resume variant</button>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-white/[0.08] p-3">
          <div className="relative flex gap-2">
            {visibleSkills.length > 0 && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(36rem,calc(100vw-8rem))] border border-white/10 bg-card p-1 shadow-2xl">
                {visibleSkills.map((skill, index) => (
                  <button key={skill.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSkill(skill)} className={`block w-full px-3 py-2 text-left ${index === skillIndex ? "bg-primary/10" : "hover:bg-white/5"}`}>
                    <span className="font-mono text-xs font-semibold text-primary">{skill.command}</span>
                    <span className="ml-2 text-xs font-medium">{skill.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{skill.description}</span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={input}
              onChange={(event) => { setInput(event.target.value); if (!event.target.value.startsWith("/")) setSelectedSkillId(undefined); setSkillIndex(0); }}
              onKeyDown={inputKeyDown}
              placeholder="Ask what to do next, or type / for skills…"
              rows={2}
              className="min-h-12 flex-1 resize-none border border-white/[0.1] bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex w-12 items-center justify-center bg-primary text-white disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-accent-amber">{error}</p>}
        </form>
      </section>

      <aside className="hidden w-80 shrink-0 space-y-3 lg:block">
        <div className="border border-white/[0.08] bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <History size={14} /> Recent chats
            </div>
            <button type="button" onClick={newConversation} className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <MessageSquarePlus size={13} /> New
            </button>
          </div>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {conversations.length === 0 && <p className="py-2 text-xs text-muted-foreground">No saved conversations yet.</p>}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                disabled={historyBusy || loading}
                className={`block w-full border px-2 py-2 text-left text-xs disabled:opacity-50 ${conversationId === conversation.id ? "border-primary/40 bg-primary/10" : "border-transparent hover:border-white/10 hover:bg-background"}`}
              >
                <span className="block truncate font-medium">{conversation.title || "Untitled chat"}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{new Date(conversation.updatedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-white/[0.08] bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-green">
            <ShieldCheck size={14} /> Approval boundary
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            KithNode may analyze and propose. It cannot send, schedule, apply, delete, or change your profile from this screen.
          </p>
        </div>

        {recommendations.map((recommendation) => (
          <div key={recommendation.id} className="border border-white/[0.08] bg-card p-3">
            <p className="text-sm font-semibold">{recommendation.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{recommendation.rationale}</p>
            <p className="mt-2 font-mono text-[10px] text-primary">
              {Math.round(recommendation.confidence * 100)}% confidence
            </p>
          </div>
        ))}

        {actions.map((action) => (
          <div key={action.id} className="border border-accent-amber/20 bg-accent-amber/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-amber">
              Proposed · {action.riskLevel}
            </p>
            <p className="mt-1 text-sm">{action.input?.label || action.toolName}</p>
            {actionPreview(action) && <p className="mt-2 whitespace-pre-wrap border border-white/10 bg-background p-2 text-xs text-text-secondary">{actionPreview(action)}</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {action.toolName === "update_goal"
                ? "Approval creates this goal. Nothing runs before you approve."
                : action.toolName === "enrich_contacts"
                  ? "Approval may spend the displayed enrichment credits on only these contact IDs."
                  : action.toolName === "save_opportunity"
                    ? "Approval saves this listing to your opportunity tracker."
                    : "Preview only. Execution is not enabled for this action yet."}
            </p>
            {action.status === "proposed" && (
              <div className="mt-3 flex gap-2">
                {["update_goal", "enrich_contacts", "save_opportunity"].includes(action.toolName) && (
                  <button type="button" onClick={() => decide(action, "approve")} className="bg-primary px-2 py-1 text-[11px] font-semibold text-white">
                    Approve
                  </button>
                )}
                <button type="button" onClick={() => decide(action, "deny")} className="border border-white/10 px-2 py-1 text-[11px] text-muted-foreground">
                  Dismiss
                </button>
              </div>
            )}
            {action.status !== "proposed" && (
              <p className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">{action.status}</p>
            )}
          </div>
        ))}
      </aside>
    </div>
  );
}
