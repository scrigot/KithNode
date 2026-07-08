import { prisma, meUserEmail } from "@/lib/me/db";
import SettingsForm from "./settings-form";
import type { MeProfileData } from "@/lib/me/profile";

export default async function MeSettings() {
  const userId = meUserEmail();
  const profile = await prisma.meProfile.findUnique({ where: { userId } });
  const initial: MeProfileData = {
    schools: profile?.schools || "",
    clubs: profile?.clubs || "",
    pastFirms: profile?.pastFirms || "",
    hometown: profile?.hometown || "",
    location: profile?.location || "",
    currentWork: profile?.currentWork || "",
    goals: profile?.goals || "",
    targetRoles: profile?.targetRoles || "",
    targetExpertise: profile?.targetExpertise || "",
    targetCompanies: profile?.targetCompanies || "",
    targetLocations: profile?.targetLocations || "",
    searchKeywords: profile?.searchKeywords || "",
    profileNotes: profile?.profileNotes || "",
    outreachStyle: profile?.outreachStyle || "",
    outreachLength: profile?.outreachLength || "",
    outreachSignoff: profile?.outreachSignoff || "",
    outreachPositioning: profile?.outreachPositioning || "",
    outreachGoals: profile?.outreachGoals || "",
    preferredEmailClient: profile?.preferredEmailClient || "",
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <p className="text-[12px] uppercase tracking-[0.2em] text-[#8A8077]">profile signals</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#B7AFA7]">
        Tell KithNode what you are trying to learn, who you want to meet, and what
        overlaps matter. Discovery uses this to generate searches and rank AI
        consulting / AI engineering mentors.
      </p>

      <div className="mt-6 rounded-xl border border-[#E8643C]/30 bg-[#E8643C]/[0.06] p-4">
        <p className="text-[13px] leading-relaxed text-[#E7E1DB]">
          Ranking still starts with ICP fit: buyers, practitioners, and ecosystem
          connectors. This profile adds warmth on top, like shared school,
          shared employer, or same area.
        </p>
      </div>

      <div className="mt-6">
        <SettingsForm initial={initial} />
      </div>
    </div>
  );
}
