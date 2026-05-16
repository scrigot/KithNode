// Adapter registry — maps a room's `adapterType` string to the concrete
// AgentAdapter instance used to handle invocations.

import type { AgentAdapter } from "./types";
import { StubAdapter } from "./adapters/stub-adapter";
import { AnthropicSdkAdapter } from "./adapters/anthropic-sdk-adapter";

const stub = new StubAdapter();
const anthropic = new AnthropicSdkAdapter();

export function getAdapter(adapterType: string): AgentAdapter {
  switch (adapterType) {
    case "anthropic_sdk":
      return anthropic;
    case "claude_code_cli":
      // Reserved for Phase 2 (local Claude Code CLI execution).
      return stub;
    case "stub":
    default:
      return stub;
  }
}
