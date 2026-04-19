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
  // Professor channel fields (all optional):
  alumniSource?: "alumni" | "professor" | "discover_run";
  profType?: "research-heavy" | "teaching-heavy" | "mixed";
  recentPaper?: string;
  researchAreas?: string[];
  department?: string;
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

/** Extracts the last name, ignoring common suffixes like "Jr." and "Sr.". */
export function getLastName(name: string): string {
  if (!name || !name.trim()) return "";
  const suffixes = new Set(["jr.", "sr.", "ii", "iii", "iv"]);
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  // Walk backwards, skip suffix tokens
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!suffixes.has(parts[i].toLowerCase().replace(/\.$/, "") + ".") &&
        !suffixes.has(parts[i].toLowerCase())) {
      return parts[i];
    }
  }
  return parts[parts.length - 1];
}

function buildProfessorClosing(ctx: OutreachContext): string {
  const lastName = getLastName(ctx.alumniName);
  return `Thank you for your time, Professor ${lastName}.\n\nBest,\n${ctx.userName}`;
}

function buildProfessorResearchDraft(ctx: OutreachContext): string {
  const lastName = getLastName(ctx.alumniName);
  const areas = ctx.researchAreas ?? [];
  const primaryArea = areas[0] ?? ctx.department ?? "your research area";
  const paperRef = ctx.recentPaper ?? areas[0] ?? primaryArea;
  const areasJoined = areas.length > 0 ? areas.join(", ") : primaryArea;

  const opener = `Hi Professor ${lastName}, I'm ${ctx.userName}, a ${ctx.userUniversity} student deeply interested in ${primaryArea}.`;
  const body = `I recently came across your work on ${paperRef} and was particularly drawn to ${areasJoined}. I'm exploring research opportunities and would love to learn more about your lab's current directions.`;
  const ask = `Would you be open to a 20-minute conversation in the coming weeks? I've been reading your recent papers and would value your perspective on how students in my position typically get involved.`;
  const closing = buildProfessorClosing(ctx);

  return `${opener}\n\n${body}\n\n${ask}\n\n${closing}`;
}

function buildProfessorTeachingDraft(ctx: OutreachContext): string {
  const lastName = getLastName(ctx.alumniName);
  const subject = ctx.department ?? (ctx.researchAreas?.[0]) ?? "your field";

  const opener = `Hi Professor ${lastName}, I'm ${ctx.userName}, a ${ctx.userUniversity} student considering enrolling in your course this semester.`;
  const body = `I've heard strong things about your approach to ${subject} and I'm excited about the topics you cover. I want to make sure I come in prepared and would value your input on what background would set me up for success.`;
  const ask = `Do you have 15 minutes to briefly chat about prerequisites or the course structure? Happy to meet during office hours or whenever is easiest.`;
  const closing = buildProfessorClosing(ctx);

  return `${opener}\n\n${body}\n\n${ask}\n\n${closing}`;
}

function buildProfessorMixedDraft(ctx: OutreachContext): string {
  const lastName = getLastName(ctx.alumniName);
  const focus = (ctx.researchAreas?.[0]) ?? ctx.department ?? "your field";
  const field = ctx.userTargetIndustry || "your field";

  const opener = `Hi Professor ${lastName}, I'm ${ctx.userName}, a ${ctx.userUniversity} student with a strong interest in ${focus}.`;
  const body = `I've been exploring ${field} and your work has come up as a reference point. I'd love to hear how you think about the intersection of research and applied work at this moment.`;
  const ask = `Could I get 15 minutes of your time for a coffee or call? I know your schedule is demanding, so I'll keep it focused.`;
  const closing = buildProfessorClosing(ctx);

  return `${opener}\n\n${body}\n\n${ask}\n\n${closing}`;
}

function generateProfessorDraft(ctx: OutreachContext): string {
  if (ctx.profType === "research-heavy") return buildProfessorResearchDraft(ctx);
  if (ctx.profType === "teaching-heavy") return buildProfessorTeachingDraft(ctx);
  return buildProfessorMixedDraft(ctx);
}

export function generateOutreachDraft(ctx: OutreachContext): string {
  if (ctx.alumniSource === "professor") return generateProfessorDraft(ctx);

  const signals = detectSharedSignals(ctx);
  const opener = buildOpener(ctx, signals);
  const body = buildBody(ctx, signals);
  const ask = buildAsk();
  const closing = buildClosing(ctx);

  return `${opener}\n\n${body}\n\n${ask}\n\n${closing}`;
}
