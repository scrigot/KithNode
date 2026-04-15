import type { ComponentType } from "react";
import { ColdInbox } from "./scenes/01-cold-inbox";
import { NetworkIgnite } from "./scenes/02-network-ignite";
import { ScoreBreakdown } from "./scenes/03-score-breakdown";
import { SignalTick } from "./scenes/04-signal-tick";
import { AiDraft } from "./scenes/05-ai-draft";
import { AutoGuardLock } from "./scenes/06-autoguard-lock";
import { RankedDashboard } from "./scenes/07-ranked-dashboard";
import { ConnectionMap } from "./scenes/09-connection-map";

export type Scene = {
  id: string;
  component: ComponentType;
  durationMs: number;
};

export const TIMELINE: Scene[] = [
  { id: "cold-inbox", component: ColdInbox, durationMs: 3200 },
  { id: "network-ignite", component: NetworkIgnite, durationMs: 3500 },
  { id: "score-breakdown", component: ScoreBreakdown, durationMs: 4500 },
  { id: "connection-map", component: ConnectionMap, durationMs: 5500 },
  { id: "signal-tick", component: SignalTick, durationMs: 4800 },
  { id: "ai-draft", component: AiDraft, durationMs: 5500 },
  { id: "autoguard-lock", component: AutoGuardLock, durationMs: 3800 },
  { id: "ranked-dashboard", component: RankedDashboard, durationMs: 5000 },
];

export const CROSSFADE_IDS = new Set(["autoguard-lock", "ranked-dashboard"]);

export const TOTAL_DURATION_MS = TIMELINE.reduce((sum, s) => sum + s.durationMs, 0);
