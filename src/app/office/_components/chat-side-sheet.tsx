"use client";

// Placeholder for Commit 3 — full implementation lands in Commit 4 with
// message history, streaming chat, and API wiring. Renders nothing visible
// until then so the floor plan + nav are testable on their own.

import type { OfficeRoom } from "./types";

export function ChatSideSheet({
  room: _room,
  onClose: _onClose,
}: {
  room: OfficeRoom | null;
  onClose: () => void;
}) {
  return null;
}
