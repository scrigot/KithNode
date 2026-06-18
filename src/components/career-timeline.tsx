import { formatExperiencePeriod } from "@/lib/educations";

export interface CareerTimelineProps {
  experiences: { title: string; firm: string; start: string; end: string }[];
}

function isCurrent(end: string): boolean {
  return end === "" || /present/i.test(end);
}

export function CareerTimeline({ experiences }: CareerTimelineProps) {
  if (experiences.length === 0) return null;

  return (
    <div className="border border-border bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        CAREER
      </h3>
      <div className="space-y-3">
        {experiences.map((exp, i) => {
          const current = isCurrent(exp.end);
          const period = formatExperiencePeriod(exp);
          const isLast = i === experiences.length - 1;

          return (
            <div key={i} className="flex gap-3">
              {/* Left rail */}
              <div className="flex flex-col items-center">
                <div
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    current ? "bg-accent-blue" : "bg-muted-foreground/40"
                  }`}
                />
                {!isLast && (
                  <div className="mt-1 w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="pb-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    {exp.title}
                  </span>
                  {current && (
                    <span className="border border-accent-blue/40 text-accent-blue text-[9px] font-bold uppercase tracking-wider px-1">
                      CURRENT
                    </span>
                  )}
                </div>
                {exp.firm && (
                  <p className="text-[11px] text-muted-foreground">{exp.firm}</p>
                )}
                {period && (
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {period}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
