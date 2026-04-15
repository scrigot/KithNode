"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { GradientBlob } from "./gradient-blob";

export function Showcase() {
  return (
    <section className="relative overflow-hidden py-24 px-4">
      <GradientBlob className="-right-40 top-10" size={500} variant="cyan" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            See your pipeline come alive
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-slate-600">
            From discovering warm connections to landing the coffee chat — track every step of your networking journey.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            {/* Pipeline mockup */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  stage: "Discovered",
                  color: "bg-slate-100",
                  dot: "bg-slate-400",
                  contacts: [
                    { name: "Alex Rivera", firm: "Lazard", score: 62 },
                    { name: "Jordan Lee", firm: "Houlihan", score: 55 },
                    { name: "Sam Wright", firm: "PJT", score: 48 },
                  ],
                },
                {
                  stage: "Contacted",
                  color: "bg-blue-50",
                  dot: "bg-blue-400",
                  contacts: [
                    { name: "Sarah Chen", firm: "Goldman", score: 71 },
                    { name: "Mike Park", firm: "Evercore", score: 65 },
                  ],
                },
                {
                  stage: "Responded",
                  color: "bg-amber-50",
                  dot: "bg-amber-400",
                  contacts: [
                    { name: "Priya Nair", firm: "Centerview", score: 78 },
                  ],
                },
                {
                  stage: "Meeting Set",
                  color: "bg-green-50",
                  dot: "bg-green-400",
                  contacts: [
                    { name: "Jacob Goldstein", firm: "KKR", score: 82 },
                  ],
                },
              ].map((col) => (
                <div key={col.stage}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {col.stage}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">{col.contacts.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.contacts.map((c) => (
                      <div
                        key={c.name}
                        className={`rounded-lg ${col.color} p-3`}
                      >
                        <p className="text-xs font-medium text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.firm}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="h-1 flex-1 rounded-full bg-slate-200">
                            <div
                              className="h-1 rounded-full bg-[#0EA5E9]"
                              style={{ width: `${c.score}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono tabular-nums text-slate-500">{c.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
