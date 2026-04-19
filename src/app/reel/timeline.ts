import type { ComponentType } from "react";
import { ColdInbox } from "./scenes/01-cold-inbox";
import { NetworkIgnite } from "./scenes/02-network-ignite";
import { ScoreBreakdown } from "./scenes/03-score-breakdown";
import { SignalTick } from "./scenes/04-signal-tick";
import { AiDraft } from "./scenes/05-ai-draft";
import { AutoGuardLock } from "./scenes/06-autoguard-lock";
import { RankedDashboard } from "./scenes/07-ranked-dashboard";
import { LogoLockup } from "./scenes/08-logo-lockup";
import { ConnectionMap } from "./scenes/09-connection-map";
import { ImportFlow } from "./scenes/10-import-flow";
import { WarmPathChain } from "./scenes/11-warm-path-chain";
import { IntroRequest } from "./scenes/12-intro-request";

export type Scene = {
  id: string;
  component: ComponentType;
  durationMs: number;
};

// 12-scene narrative arc (~31s total):
// Problem -> Network -> Import -> Map -> Specific path -> Score -> Signals -> Draft -> Intro -> Trust -> Result -> Brand
export const TIMELINE: Scene[] = [
  { id: "cold-inbox", component: ColdInbox, durationMs: 1900 },
  { id: "network-ignite", component: NetworkIgnite, durationMs: 2400 },
  { id: "import-flow", component: ImportFlow, durationMs: 2600 },
  { id: "connection-map", component: ConnectionMap, durationMs: 3000 },
  { id: "warm-path-chain", component: WarmPathChain, durationMs: 3200 },
  { id: "score-breakdown", component: ScoreBreakdown, durationMs: 2800 },
  { id: "signal-tick", component: SignalTick, durationMs: 2200 },
  { id: "ai-draft", component: AiDraft, durationMs: 3400 },
  { id: "intro-request", component: IntroRequest, durationMs: 2800 },
  { id: "autoguard-lock", component: AutoGuardLock, durationMs: 2000 },
  { id: "ranked-dashboard", component: RankedDashboard, durationMs: 3000 },
  { id: "logo-lockup", component: LogoLockup, durationMs: 2200 },
];

// All transitions crossfade for cohesion.
export const CROSSFADE_IDS = new Set(TIMELINE.map((s) => s.id));

export const TOTAL_DURATION_MS = TIMELINE.reduce((sum, s) => sum + s.durationMs, 0);
