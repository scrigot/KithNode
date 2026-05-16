// Stub adapter — used by 7 of 8 Phase 1 rooms. Yields a canned response
// after a 600ms delay so the chat UI still demonstrates token streaming
// without a real model wired up.

import type { AgentAdapter, AgentContext, AgentEvent } from "../types";

const STUB_RESPONSE =
  "Coming soon. I'm not wired up yet.";

export class StubAdapter implements AgentAdapter {
  async *invoke(_ctx: AgentContext): AsyncIterable<AgentEvent> {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 600));
    yield { type: "token", content: STUB_RESPONSE };
    yield { type: "done", finalText: STUB_RESPONSE };
  }
}
