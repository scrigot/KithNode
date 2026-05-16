// AgentOffice — adapter contract.
//
// Each "room" is backed by an AgentAdapter implementation. The adapter takes
// an AgentContext (system prompt + history + new user message) and returns
// an AsyncIterable of AgentEvent values. The API route consumes the stream,
// forwards events to the client over SSE, and persists the final text.

export interface AgentContext {
  roomId: string;
  roomSlug: string;
  systemPrompt: string;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

export type AgentEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; output: string }
  | { type: "done"; finalText: string };

export interface AgentAdapter {
  invoke(ctx: AgentContext): AsyncIterable<AgentEvent>;
}
