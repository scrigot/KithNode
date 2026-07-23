import type { CareerSkillId } from "@/lib/assistant/skills";

export function skillParametersFromMessage(
  skillId: CareerSkillId,
  message: string,
  supplied: Record<string, unknown> | undefined,
) {
  const parameters: Record<string, unknown> = { ...(supplied || {}) };
  if (skillId !== "find_jobs" && skillId !== "find_internships") return parameters;

  const command = skillId === "find_internships" ? "/find-internships" : "/find-jobs";
  const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const commandPattern = new RegExp(`^\\s*${escapedCommand}\\b`, "i");

  const hasExplicitCommand = commandPattern.test(message);
  const urlMatch = message.match(/https?:\/\/[^\s]+/i);
  const commandBody = message.replace(commandPattern, "").trim();
  if (!urlMatch) {
    if (hasExplicitCommand && !parameters.company && !parameters.companies && commandBody) {
      parameters.companies = commandBody.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
    }
    return parameters;
  }
  if (!parameters.careerUrl) parameters.careerUrl = urlMatch[0].replace(/[),.;]+$/, "");

  if (hasExplicitCommand && !parameters.company) {
    const beforeUrl = message.slice(0, urlMatch.index).replace(commandPattern, "").trim();
    if (beforeUrl) parameters.company = beforeUrl.slice(0, 160);
  }
  return parameters;
}
