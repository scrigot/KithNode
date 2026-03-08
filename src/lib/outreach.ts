/**
 * Outreach draft generation for KithNode.
 * Generates personalized, authentic outreach emails based on shared context
 * between user and alumni contact. No generic AI patterns — active voice,
 * specific references, genuine curiosity.
 */

export interface OutreachContext {
  userName: string;
  userUniversity: string;
  userTargetIndustry: string;
  alumniName: string;
  alumniTitle: string;
  alumniFirm: string;
  alumniUniversity: string;
  strengthScore: number;
}

interface SharedSignal {
  type: "university" | "industry" | "firm";
  detail: string;
}

function detectSharedSignals(ctx: OutreachContext): SharedSignal[] {
  const signals: SharedSignal[] = [];

  if (
    ctx.userUniversity &&
    ctx.alumniUniversity &&
    ctx.userUniversity.toLowerCase() === ctx.alumniUniversity.toLowerCase()
  ) {
    signals.push({ type: "university", detail: ctx.userUniversity });
  }

  if (ctx.userTargetIndustry && ctx.alumniFirm) {
    signals.push({ type: "industry", detail: ctx.userTargetIndustry });
  }

  if (ctx.alumniFirm) {
    signals.push({ type: "firm", detail: ctx.alumniFirm });
  }

  return signals;
}

function buildOpener(ctx: OutreachContext, signals: SharedSignal[]): string {
  const firstName = ctx.alumniName.split(" ")[0];

  const universitySignal = signals.find((s) => s.type === "university");
  if (universitySignal) {
    return `Hi ${firstName}, I'm ${ctx.userName} — a fellow ${universitySignal.detail} alum currently exploring opportunities in ${ctx.userTargetIndustry || "finance"}.`;
  }

  return `Hi ${firstName}, I'm ${ctx.userName}, a student at ${ctx.userUniversity || "university"} with a strong interest in ${ctx.userTargetIndustry || "finance"}.`;
}

function buildBody(ctx: OutreachContext, signals: SharedSignal[]): string {
  const firmSignal = signals.find((s) => s.type === "firm");
  const parts: string[] = [];

  if (firmSignal) {
    parts.push(
      `I came across your profile and was impressed by your work at ${firmSignal.detail} as ${ctx.alumniTitle}.`,
    );
  } else {
    parts.push(
      `I came across your profile and was impressed by your experience as ${ctx.alumniTitle}.`,
    );
  }

  if (ctx.userTargetIndustry) {
    parts.push(
      `I'm particularly curious about what drew you to ${ctx.userTargetIndustry} and how you've seen the industry evolve.`,
    );
  }

  return parts.join(" ");
}

function buildAsk(): string {
  return "Would you be open to a 15-minute call sometime in the next few weeks? I'd love to hear your perspective and any advice you might have.";
}

function buildClosing(ctx: OutreachContext): string {
  return `Thank you for your time, ${ctx.alumniName.split(" ")[0]}.\n\nBest,\n${ctx.userName}`;
}

export function generateOutreachDraft(ctx: OutreachContext): string {
  const signals = detectSharedSignals(ctx);
  const opener = buildOpener(ctx, signals);
  const body = buildBody(ctx, signals);
  const ask = buildAsk();
  const closing = buildClosing(ctx);

  return `${opener}\n\n${body}\n\n${ask}\n\n${closing}`;
}
