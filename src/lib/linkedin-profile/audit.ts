import type { LinkedInProfileContent, LinkedInSectionKey } from "./schema";

export interface LinkedInAuditIssue {
  id: string;
  section: "basics" | "positioning" | LinkedInSectionKey;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  recommendation: string;
}

export interface LinkedInAudit {
  score: number;
  auditedAt: string;
  dimensions: Array<{ key: string; label: string; score: number; max: number }>;
  issues: LinkedInAuditIssue[];
  strengths: string[];
  keywordCoverage: { present: string[]; missing: string[] };
}

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const hasMetric = (value: string) => /\b\d+(?:[.,]\d+)?(?:%|x|k|m|b|\+)?\b/i.test(value);
const hasAction = (value: string) => /\b(built|created|led|launched|increased|reduced|grew|delivered|managed|designed|implemented|analyzed|won|improved|developed|founded|generated)\b/i.test(value);

export function auditLinkedInProfile(content: LinkedInProfileContent): LinkedInAudit {
  const issues: LinkedInAuditIssue[] = [];
  const strengths: string[] = [];
  const add = (issue: Omit<LinkedInAuditIssue, "id">) => issues.push({ id: `${issue.section}-${issues.length + 1}`, ...issue });
  const { basics, positioning, sections } = content;

  let completeness = 0;
  const core = [basics.firstName, basics.lastName, basics.headline, basics.about, basics.location, basics.industry, basics.profilePhotoUrl, basics.bannerImageUrl];
  completeness += Math.round((core.filter(Boolean).length / core.length) * 16);
  const populatedSections = Object.values(sections).filter((items) => items.length > 0).length;
  completeness += Math.min(9, populatedSections);

  let positioningScore = 0;
  if (basics.headline.length >= 40 && basics.headline.length <= 220) positioningScore += 8;
  else add({ section: "basics", severity: "high", title: "Headline needs sharper positioning", detail: `Current headline is ${basics.headline.length} characters.`, recommendation: "Use 40–220 characters: target role, specialty, proof, and differentiator." });
  if (words(basics.about) >= 80) positioningScore += 7;
  else add({ section: "basics", severity: "high", title: "About section is too thin", detail: `${words(basics.about)} words do not establish a credible narrative.`, recommendation: "Write 150–300 words covering direction, proof, strengths, and a clear call to action." });
  if (positioning.targetRoles.length > 0 && positioning.valueProposition) positioningScore += 5;
  else add({ section: "positioning", severity: "medium", title: "Target positioning is incomplete", detail: "The editor does not yet know both your target role and value proposition.", recommendation: "Add target roles and a one-sentence value proposition so every section supports the same story." });

  let credibility = 0;
  const experience = sections.experience;
  if (experience.length > 0) credibility += 5;
  else add({ section: "experience", severity: "high", title: "Experience is missing", detail: "Recruiters cannot verify your trajectory without roles or internships.", recommendation: "Add every relevant role and describe the problem, action, and outcome." });
  const described = experience.filter((entry) => words(entry.description) >= 20);
  const quantified = experience.filter((entry) => hasMetric(entry.description));
  const actionLed = experience.filter((entry) => hasAction(entry.description));
  credibility += Math.min(8, described.length * 2);
  credibility += Math.min(7, quantified.length * 2 + actionLed.length);
  if (experience.length && quantified.length === 0) add({ section: "experience", severity: "high", title: "Experience lacks measurable proof", detail: "No experience description contains a number or quantified outcome.", recommendation: "Add truthful scale, speed, revenue, users, accuracy, volume, or time saved where evidence exists." });
  if (sections.projects.length > 0 || sections.featured.length > 0) credibility += 5;
  else add({ section: "featured", severity: "medium", title: "No visible proof of work", detail: "The profile has no projects or Featured items.", recommendation: "Feature 2–4 strong projects, case studies, posts, or portfolio links." });

  let discoverability = 0;
  const profileText = JSON.stringify(content).toLowerCase();
  const keywords = [...new Set(positioning.keywords.map((keyword) => keyword.trim()).filter(Boolean))];
  const present = keywords.filter((keyword) => profileText.includes(keyword.toLowerCase()));
  const missing = keywords.filter((keyword) => !profileText.includes(keyword.toLowerCase()));
  discoverability += Math.min(10, sections.skills.length);
  discoverability += keywords.length ? Math.round((present.length / keywords.length) * 10) : 0;
  if (sections.skills.length < 10) add({ section: "skills", severity: "medium", title: "Skills coverage is narrow", detail: `${sections.skills.length} skills are recorded.`, recommendation: "Add 10–25 role-relevant skills and prioritize the three most important." });
  if (!keywords.length) add({ section: "positioning", severity: "medium", title: "No search keywords defined", detail: "Keyword coverage cannot be measured.", recommendation: "Add target-role keywords, tools, domains, and certifications recruiters search for." });
  else if (missing.length) add({ section: "positioning", severity: "low", title: "Important keywords are absent", detail: `${missing.slice(0, 8).join(", ")} are not represented in the profile.`, recommendation: "Add only truthful missing keywords to the headline, About, skills, or relevant experience." });

  let trust = 0;
  if (sections.education.length > 0) trust += 2;
  if (sections.recommendations.length >= 2) trust += 3;
  else add({ section: "recommendations", severity: "low", title: "Social proof is limited", detail: `${sections.recommendations.length} recommendations are recorded.`, recommendation: "Request 2–3 specific recommendations from managers, collaborators, professors, or clients." });
  if (basics.website || sections.featured.some((item) => item.url)) trust += 3;
  if (basics.email || basics.website) trust += 2;

  if (basics.profilePhotoUrl) strengths.push("Profile photo is present");
  if (basics.bannerImageUrl) strengths.push("Custom banner is present");
  if (quantified.length) strengths.push(`${quantified.length} experience ${quantified.length === 1 ? "entry uses" : "entries use"} quantified proof`);
  if (sections.featured.length) strengths.push(`${sections.featured.length} Featured proof item${sections.featured.length === 1 ? "" : "s"}`);
  if (sections.recommendations.length >= 2) strengths.push("Recommendation coverage builds trust");

  const score = Math.max(0, Math.min(100, completeness + positioningScore + credibility + discoverability + trust));
  return {
    score,
    auditedAt: new Date().toISOString(),
    dimensions: [
      { key: "completeness", label: "Completeness", score: completeness, max: 25 },
      { key: "positioning", label: "Positioning", score: positioningScore, max: 20 },
      { key: "credibility", label: "Credibility", score: credibility, max: 25 },
      { key: "discoverability", label: "Discoverability", score: discoverability, max: 20 },
      { key: "trust", label: "Trust", score: trust, max: 10 },
    ],
    issues: issues.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity])),
    strengths,
    keywordCoverage: { present, missing },
  };
}
