"use client";

import * as React from "react";
import { Upload, BarChart3, FileText, Check } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { MeshBg } from "./mesh-bg";
import { WarmSignalsReplica } from "./warm-signals-replica";

// ---------------------------------------------------------------------------
// LEFT visual -- LinkedIn CSV importing, live. The file card drops in (CSS),
// a check stamps, a progress bar fills, then connections POP IN at the top of
// the feed one at a time (timer-driven prepend + CSS pop + shake). No scroll.
// ---------------------------------------------------------------------------
const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const STREAM_NAMES = [
  { n: "Riley Chen", t: "Analyst @ Goldman Sachs" },
  { n: "Drew Castro", t: "Associate @ Lazard" },
  { n: "Nisha Rao", t: "VP @ Evercore" },
  { n: "Marcus Webb", t: "Summer Analyst @ Moelis" },
  { n: "Priya Shah", t: "Analyst @ Morgan Stanley" },
  { n: "Tyler Brooks", t: "Associate @ Centerview" },
  { n: "Sofia Marin", t: "VP @ Jefferies" },
  { n: "Daniel Okafor", t: "Analyst @ J.P. Morgan" },
  { n: "Hannah Reyes", t: "Summer Analyst @ PJT Partners" },
  { n: "Aaron Liu", t: "Associate @ Houlihan Lokey" },
  { n: "Maya Goldberg", t: "Analyst @ Bank of America" },
  { n: "Caleb Foster", t: "VP @ Perella Weinberg" },
  { n: "Olivia Nguyen", t: "Analyst @ Qatalyst Partners" },
  { n: "Jordan Patel", t: "Associate @ Guggenheim" },
  { n: "Emma Dawson", t: "Summer Analyst @ Greenhill" },
  { n: "Liam Carter", t: "Analyst @ Citi" },
  { n: "Grace Sullivan", t: "VP @ Rothschild & Co" },
  { n: "Noah Bennett", t: "Associate @ Barclays" },
  { n: "Ava Romano", t: "Analyst @ Credit Suisse" },
  { n: "Ethan Park", t: "Summer Analyst @ Deutsche Bank" },
  { n: "Chloe Adams", t: "Analyst @ Wells Fargo" },
  { n: "Mason Reed", t: "Associate @ UBS" },
  { n: "Isabella Cruz", t: "VP @ Allen & Company" },
  { n: "Logan Hayes", t: "Analyst @ Raymond James" },
  { n: "Zoe Mitchell", t: "Summer Analyst @ William Blair" },
  { n: "Owen Fischer", t: "Associate @ Lincoln International" },
  { n: "Lily Tanaka", t: "Analyst @ RBC Capital Markets" },
  { n: "Gabriel Santos", t: "VP @ BNP Paribas" },
  { n: "Natalie Brooks", t: "Analyst @ Wachtell, Lipton" },
  { n: "Henry Walsh", t: "Summer Analyst @ Blackstone" },
];

function StreamRow({ n, t }: { n: string; t: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] bg-white/10 px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
        {initials(n)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-white">{n}</p>
        <p className="truncate text-[10px] text-white/55">{t}</p>
      </div>
    </div>
  );
}

const VISIBLE = 3;

function CsvImport() {
  const [feed, setFeed] = React.useState(() =>
    STREAM_NAMES.slice(0, VISIBLE).map((r, i) => ({ ...r, id: i })),
  );
  const nextIdx = React.useRef(VISIBLE);
  const nextId = React.useRef(VISIBLE);

  React.useEffect(() => {
    const t = setInterval(() => {
      setFeed((prev) => {
        const r = STREAM_NAMES[nextIdx.current % STREAM_NAMES.length];
        nextIdx.current += 1;
        return [{ ...r, id: nextId.current++ }, ...prev].slice(0, VISIBLE);
      });
    }, 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/15 bg-black/25 p-5 backdrop-blur-sm">
      <style>{`
        @keyframes imp-dot { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes imp-drop { from{opacity:0;transform:translateY(-16px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes imp-stamp { 0%{opacity:0;transform:scale(0)} 60%{opacity:0;transform:scale(0)} 78%{opacity:1;transform:scale(1.25)} 100%{opacity:1;transform:scale(1)} }
        @keyframes imp-fill { from{width:0%} to{width:100%} }
        @keyframes imp-pop { 0%{opacity:0;transform:translateY(-10px) scale(.92)} 55%{opacity:1;transform:translateY(0) scale(1.04)} 100%{transform:translateY(0) scale(1)} }
        @keyframes imp-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 50%{transform:translateX(3px)} 75%{transform:translateX(-2px)} }
        .imp-dot{animation:imp-dot 1.6s ease-in-out infinite}
        .imp-drop{animation:imp-drop .6s cubic-bezier(.22,1,.36,1) both}
        .imp-stamp{animation:imp-stamp 1.4s ease-out both}
        .imp-fill{animation:imp-fill 3s ease-in-out both}
        .imp-pop{animation:imp-pop .3s ease-out, imp-shake .4s ease-in-out .3s}
      `}</style>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="imp-dot h-2 w-2 rounded-full bg-white" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
            LinkedIn import
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
          Reading
        </span>
      </div>

      {/* File card -- drops in, then a check badge stamps on */}
      <div className="imp-drop relative flex items-center gap-3 rounded-[16px] bg-white/10 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/15">
          <FileText className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            connections.csv
          </p>
          <p className="font-mono text-[11px] text-white/60">
            633 rows · name, company, title
          </p>
        </div>
        <span className="imp-stamp flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40">
          <Check className="h-3.5 w-3.5 text-[#075985]" strokeWidth={3} />
        </span>
      </div>

      {/* Progress bar -- fills left to right */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="imp-fill h-1.5 rounded-full bg-white/80" />
      </div>

      {/* Pop-up feed -- newest connection pops in at the top + shakes */}
      <div className="mt-4 space-y-2">
        {feed.map((r, idx) => (
          <div key={r.id} className={idx === 0 ? "imp-pop" : ""}>
            <StreamRow n={r.n} t={r.t} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline verb pill -- Cluely chip treatment
// ---------------------------------------------------------------------------
function VerbPill({
  children,
  Icon,
  tone,
}: {
  children: React.ReactNode;
  Icon: typeof Upload;
  tone: "on-fill" | "on-dark";
}) {
  const cls =
    tone === "on-fill"
      ? "bg-white/20 text-white"
      : "bg-[#0EA5E9]/15 text-[#0EA5E9]";
  return (
    <span
      className={`mx-1 inline-flex items-center gap-1.5 rounded-[16px] px-2.5 py-0.5 align-middle ${cls}`}
    >
      <Icon className="h-[1.1em] w-[1.1em]" />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section -- Import -> Rank (two-card, equal height, fits one view)
// ---------------------------------------------------------------------------
export function SectionImportRank() {
  return (
    <section className="relative overflow-hidden bg-black px-4 py-8 sm:py-12">
      <MeshBg />
      <div className="relative mx-auto max-w-7xl">
        <ScrollReveal>
          <h2 className="font-heading text-4xl font-medium leading-[1.05] tracking-[-0.027em] text-white sm:text-5xl">
            Your network, ranked in seconds
          </h2>

          <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            {/* LEFT -- saturated teal card */}
            <div className="relative flex flex-col overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0EA5E9] to-[#075985] p-6 sm:p-8">
              <h3 className="font-heading text-2xl font-medium leading-snug tracking-[-0.018em] text-white sm:text-3xl">
                KithNode
                <VerbPill Icon={Upload} tone="on-fill">
                  imports
                </VerbPill>
                your LinkedIn export
              </h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/80">
                Export your connections once. It reads name, company, and title.
                No password, no bot, nothing that touches your account.
              </p>
              <div className="mt-6 flex flex-1 flex-col justify-center">
                <CsvImport />
              </div>
            </div>

            {/* RIGHT -- neutral elevated card */}
            <div className="relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.1] bg-white/[0.05] p-6 backdrop-blur-sm sm:p-8">
              <h3 className="font-heading text-2xl font-medium leading-snug tracking-[-0.018em] text-white sm:text-3xl">
                and
                <VerbPill Icon={BarChart3} tone="on-dark">
                  ranks
                </VerbPill>
                all 633 by who can help
              </h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/60">
                Every connection scored by real shared signals, then sorted into
                KITH, HOT, and WARM so you know who to start with.
              </p>
              <div className="mt-6 flex flex-1 flex-col justify-center">
                <div className="overflow-hidden rounded-[16px] border border-white/[0.08]">
                  <WarmSignalsReplica limit={2} />
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
