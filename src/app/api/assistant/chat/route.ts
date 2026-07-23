import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AI_MODELS } from "@/lib/ai-models";
import { buildAssistantContext } from "@/lib/assistant/context";
import { planAssistantResponse } from "@/lib/assistant/planner";
import { assistantRequestSchema } from "@/lib/assistant/schemas";
import { assistantToolPolicy } from "@/lib/assistant/tools";
import { executeCareerSkill, inferCareerSkill, skillResultJson } from "@/lib/assistant/skill-engine";
import { assistantErrorResponse, AssistantHttpError } from "@/lib/assistant/errors";
import { serverEnv } from "@/lib/env/server";
import { assistantRepository } from "@/lib/assistant/repository";
import { isDeterministicCareerSkill } from "@/lib/assistant/skills";
import { skillParametersFromMessage } from "@/lib/assistant/skill-parameters";
import { supabase } from "@/lib/supabase";
import { isCurrentUndergraduateProfile } from "@/lib/jobs/matching";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return await getAssistant(request);
  } catch (error) {
    return assistantErrorResponse(error);
  }
}

async function getAssistant(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    const conversations = await assistantRepository.listConversations(userId);
    return NextResponse.json({ conversations });
  }

  const conversation = await assistantRepository.conversation(conversationId, userId);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const runs = await assistantRepository.listRunIds(conversationId, userId);
  const runIds = runs.map((run) => String(run.id));
  const [messages, toolCalls, actions] = await Promise.all([
    assistantRepository.listMessages(conversationId, userId),
    assistantRepository.listToolCalls(userId, runIds),
    assistantRepository.listActions(userId, runIds),
  ]);
  const actionsByToolCall = new Map(actions.map((action) => [String(action.toolCallId), action]));
  return NextResponse.json({
    conversation,
    messages,
    toolCalls: toolCalls.map((toolCall) => {
      const action = actionsByToolCall.get(String(toolCall.id));
      if (!action) return toolCall;
      return {
        ...toolCall,
        actionId: action.id,
        status: action.status === "previewed" ? toolCall.status : action.status,
        output: action.output || toolCall.output,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    return streamAssistant(request);
  }
  try {
    return await postAssistant(request);
  } catch (error) {
    return assistantErrorResponse(error);
  }
}

type ProgressWriter = (message: string) => void | Promise<void>;

async function postAssistant(request: NextRequest, onProgress?: ProgressWriter) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = assistantRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  let conversation = parsed.data.conversationId
    ? await assistantRepository.conversation(parsed.data.conversationId, userId)
    : null;
  if (parsed.data.conversationId && !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!conversation) {
    conversation = await assistantRepository.createConversation(userId, parsed.data.message.slice(0, 80));
  }

  await assistantRepository.createMessage({ conversationId: String(conversation.id), userId, role: "user", content: parsed.data.message });
  await onProgress?.("Loading your current KithNode evidence…");
  const history = await assistantRepository.listMessages(String(conversation.id), userId, true, 12);
  const run = await assistantRepository.createRun({ conversationId: String(conversation.id), userId, model: AI_MODELS.default });

  let isCurrentUndergraduate = false;
  if (!parsed.data.skillId && !parsed.data.message.trim().startsWith("/")) {
    const { data: profile } = await supabase.from("User").select("graduationYear,university,major,degrees,educations").eq("id", userId).maybeSingle();
    isCurrentUndergraduate = isCurrentUndergraduateProfile(profile || {});
  }
  const inferredSkill = parsed.data.skillId || inferCareerSkill(parsed.data.message, { isCurrentUndergraduate });
  if (inferredSkill && isDeterministicCareerSkill(inferredSkill) && serverEnv().ENABLE_CAREER_SKILLS !== "false") {
    await onProgress?.(`Running ${inferredSkill.replaceAll("_", " ")} from verified data…`);
    const parameters = skillParametersFromMessage(inferredSkill, parsed.data.message, parsed.data.parameters);
    let skillResult;
    try {
      skillResult = await executeCareerSkill({
        skillId: inferredSkill,
        userId,
        userEmail: session.user?.email || userId,
        parameters,
        onProgress,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Skill execution failed";
      await assistantRepository.updateRun(String(run.id), userId, { status: "failed", error: message, completedAt: new Date().toISOString() });
      throw new AssistantHttpError(500, "persistence_failed", message, true);
    }

    const storedResult = await assistantRepository.createResult({
      runId: String(run.id),
      userId,
      skillId: inferredSkill,
      status: skillResult.status === "complete" || !skillResult.status ? "ready" : skillResult.status,
      payload: skillResultJson(skillResult),
      sourceFreshAt: skillResult.freshness,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    });
    const readToolCall = await assistantRepository.createToolCall({
        runId: run.id,
        userId,
        toolName: `skill_${inferredSkill}`,
        input: { message: parsed.data.message, parameters, resultId: storedResult.id },
        output: { resultId: storedResult.id, ...skillResultJson(skillResult) },
        status: "completed",
        riskLevel: "read",
        requiresApproval: false,
        completedAt: new Date().toISOString(),
    });
    const assistantMessage = await assistantRepository.createMessage({
        conversationId: conversation.id,
        userId,
        role: "assistant",
        content: skillResult.summary,
        meta: {
          runId: run.id,
          resultId: storedResult.id,
          skillId: inferredSkill,
          toolCallId: readToolCall.id,
          freshness: skillResult.freshness,
        },
    });
    await onProgress?.("Saving the result and its evidence…");
    const candidateSaveActions = ["find_internships", "find_jobs"].includes(inferredSkill)
      ? skillResult.cards
          .filter((card) => Boolean(card.data?.opportunity))
          .map((card) => ({
            toolName: "save_opportunity" as const,
            label: `Save ${card.title} at ${card.subtitle?.split(" · ")[0] || "this organization"} to Applications`,
            input: { resultId: storedResult.id, candidateId: card.id },
          }))
      : [];
    const actionPreviews = [...skillResult.proposedActions, ...candidateSaveActions];
    const proposedActions = await Promise.all(actionPreviews.map(async (action, index) => {
      const policy = assistantToolPolicy(action.toolName);
      const actionInput = { ...action.input, label: action.label };
      const toolCall = await assistantRepository.createToolCall({
        runId: run.id,
        userId,
        toolName: action.toolName,
        input: actionInput,
        riskLevel: policy.riskLevel,
        requiresApproval: true,
      });
      await assistantRepository.createAction({
        userId,
        runId: String(run.id),
        resultId: String(storedResult.id),
        toolCallId: String(toolCall.id),
        actionType: action.toolName,
        idempotencyKey: `${run.id}:${action.toolName}:${String(action.input.candidateId || index)}`,
        preview: {
          label: action.label,
          resultId: storedResult.id,
          candidateId: action.input.candidateId || null,
          consequence: action.toolName === "save_opportunity"
            ? "Creates one saved Applications record. It does not apply or contact anyone."
            : "Runs only after approval.",
        },
        actionInput,
      });
      await assistantRepository.createApproval(String(toolCall.id), userId);
      return toolCall;
    }));
    await Promise.all([
      assistantRepository.updateRun(String(run.id), userId, { status: "completed", model: "deterministic", completedAt: new Date().toISOString() }),
      assistantRepository.touchConversation(String(conversation.id), userId),
    ]);
    return NextResponse.json({
      conversationId: conversation.id,
      resultId: storedResult.id,
      message: assistantMessage,
      recommendations: [],
      proposedActions,
      skillResult,
    });
  }

  const context = await buildAssistantContext(userId);
  await onProgress?.("Planning with bounded, read-only tools…");

  let result;
  try {
    result = await planAssistantResponse({
      message: parsed.data.message,
      context,
      history: history.reverse().map(({ role, content }) => ({ role, content })),
      onProgress,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Planning failed";
    await assistantRepository.updateRun(String(run.id), userId, { status: "failed", error: errorMessage, completedAt: new Date().toISOString() });
    throw new AssistantHttpError(503, "model_unavailable", "The planning model is temporarily unavailable. Your message was saved; retry when AI Gateway is ready.", true);
  }

  const assistantMessage = await assistantRepository.createMessage({
      conversationId: conversation.id,
      userId,
      role: "assistant",
      content: result.plan.reply,
      meta: { runId: run.id, degraded: false },
  });
  await onProgress?.("Saving the answer and approval-gated proposals…");

  for (const traced of result.toolTrace) {
    await assistantRepository.createToolCall({
      runId: run.id,
      userId,
      toolName: "inspect_context",
      input: { section: traced.section },
      output: JSON.parse(JSON.stringify(traced.output ?? null)),
      status: "completed",
      riskLevel: "read",
      requiresApproval: false,
      completedAt: new Date().toISOString(),
    });
  }

  const recommendations = await Promise.all(
    result.plan.recommendations.map((item) =>
      assistantRepository.createRecommendation({
          userId,
          kind: item.kind,
          title: item.title,
          rationale: item.rationale,
          evidence: item.evidence,
          confidence: item.confidence,
          dueAt: item.dueAt,
      }),
    ),
  );

  const toolCalls = await Promise.all(
    result.plan.proposedActions.map(async (action) => {
      const policy = assistantToolPolicy(action.toolName);
      const toolCall = await assistantRepository.createToolCall({
          runId: run.id,
          userId,
          toolName: action.toolName,
          input: { ...action.input, label: action.label },
          riskLevel: policy.riskLevel,
          requiresApproval: policy.requiresApproval,
      });
      await assistantRepository.createApproval(String(toolCall.id), userId);
      return toolCall;
    }),
  );

  await Promise.all([
    assistantRepository.updateRun(String(run.id), userId, {
        status: "completed",
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        error: "",
        completedAt: new Date().toISOString(),
    }),
    assistantRepository.touchConversation(String(conversation.id), userId),
  ]);

  return NextResponse.json({
    conversationId: conversation.id,
    message: assistantMessage,
    recommendations,
    proposedActions: toolCalls,
    degraded: false,
  });
}

function streamAssistant(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      write({ type: "status", message: "Starting Career Copilot…" });
      try {
        const response = await postAssistant(request, (message) => write({ type: "status", message }));
        const data = await response.json();
        write({ type: response.ok ? "result" : "error", status: response.status, data });
      } catch (error) {
        const response = assistantErrorResponse(error);
        write({ type: "error", status: response.status, data: await response.json() });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
