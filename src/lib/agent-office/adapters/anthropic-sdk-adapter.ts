// Anthropic SDK adapter — uses Vercel AI SDK v6 + AI Gateway. NEVER call
// @anthropic-ai/sdk directly (see CLAUDE.md anti-pattern).
//
// Phase 1: wired exclusively to the Code Review Desk. Model defaults to
// claude-sonnet-4.5 via the gateway; override via env if needed.

import { streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { AgentAdapter, AgentContext, AgentEvent } from "../types";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

export class AnthropicSdkAdapter implements AgentAdapter {
  private readonly modelId: string;

  constructor(modelId?: string) {
    this.modelId =
      modelId ||
      process.env.AGENT_OFFICE_ANTHROPIC_MODEL ||
      DEFAULT_MODEL;
  }

  async *invoke(ctx: AgentContext): AsyncIterable<AgentEvent> {
    const messages = [
      ...ctx.history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: ctx.userMessage },
    ];

    const result = streamText({
      model: gateway(this.modelId),
      system: ctx.systemPrompt,
      messages,
    });

    let finalText = "";
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        finalText += part.text;
        yield { type: "token", content: part.text };
      }
    }

    yield { type: "done", finalText };
  }
}
