import { meUserEmail } from "@/lib/me/config";

// Home / control panel for the /me workspace. Static (no DB) so it renders even
// before the local Postgres is wired — it's the first thing you see when you run
// PERSONAL_MODE=1 npm run dev and visit /me. Shows the Milestone 1 build status
// and the behavioral kill-metric the autoplan CEO review locked in.

const M1: { key: string; title: string; blurb: string; status: "wip" | "queued" | "done" }[] = [
  { key: "A", title: "Foundation", blurb: "Flag, isolated shell, local-Postgres data layer, one-way import", status: "wip" },
  { key: "B", title: "Org pipelines", blurb: "Comfort · Anvil · UNC · AI Consulting, each with stages + a rollup", status: "queued" },
  { key: "C", title: "Warm-network ranking", blurb: "Who to reconnect with for AI consulting, who can intro me", status: "queued" },
  { key: "D", title: "Contact memory", blurb: "Relationship type, strategic value, action items per person", status: "queued" },
  { key: "E", title: "Email drafting", blurb: "Reuse the outreach drafter, sourced from local data", status: "queued" },
  { key: "F", title: "Coffee-chat prep", blurb: "One-click brief before any chat — the hero build", status: "queued" },
];

const STATUS_STYLE: Record<string, string> = {
  wip: "text-[#E8643C] bg-[#E8643C]/10 border-[#E8643C]/30",
  queued: "text-[#8A8077] bg-[#2E2A27] border-[#38332F]",
  done: "text-[#7FB069] bg-[#7FB069]/10 border-[#7FB069]/30",
};

const STATUS_LABEL: Record<string, string> = { wip: "building", queued: "queued", done: "done" };

export default function MeHome() {
  return (
    <div className="max-w-4xl mx-auto px-10 py-12">
      <p className="text-[12px] uppercase tracking-[0.2em] text-[#8A8077]">
        {meUserEmail()}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your networking OS</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#B7AFA7] max-w-2xl">
        A private workspace to work your real network for in-field AI consulting:
        rank who to reconnect with, track relationships at Comfort / Anvil / UNC,
        prep every coffee chat, and draft outreach. Isolated on localhost — it
        never touches the live KithNode app or its users.
      </p>

      {/* The honesty mechanism from the CEO review: a behavioral kill-metric. */}
      <div className="mt-8 rounded-xl border border-[#38332F] bg-[#232020] p-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E8643C]" />
          <span className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077]">
            the only metric that matters
          </span>
        </div>
        <p className="mt-2 text-[15px] text-[#E7E1DB]">
          Chats booked / asks made per week — measured against last week&rsquo;s manual baseline.
          If 2 weeks in this hasn&rsquo;t raised real outreach, it gets deleted. No sunk cost.
        </p>
      </div>

      <h2 className="mt-10 text-[12px] uppercase tracking-[0.2em] text-[#8A8077]">
        Milestone 1
      </h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {M1.map((f) => (
          <div
            key={f.key}
            className="rounded-xl border border-[#38332F] bg-[#232020] p-4 hover:border-[#4A443F] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono text-[#6F665E] mt-0.5">{f.key}</span>
                <span className="text-[15px] font-medium text-white">{f.title}</span>
              </div>
              <span
                className={`shrink-0 text-[10px] uppercase tracking-wide rounded-full border px-2 py-0.5 ${STATUS_STYLE[f.status]}`}
              >
                {STATUS_LABEL[f.status]}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#9C948C]">{f.blurb}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-[12px] text-[#6F665E]">
        Next: wire the local database, push the additive schema, import your contacts.
      </p>
    </div>
  );
}
