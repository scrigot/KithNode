"use client";

// Member profile/contact card modal. Click a member (in a node or the friends
// list) → fetch their gated card and render it. Friends/co-members see the full
// professional card; everyone else sees just name + photo with a nudge.

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatExperiencePeriod, type EducationEntry, type ExperienceEntry } from "@/lib/educations";
import type { ClubEntry } from "@/lib/club-memberships";

interface MemberCard {
  name: string;
  image: string;
  visible: boolean;
  university?: string;
  graduationYear?: number | null;
  degrees?: string;
  major?: string;
  concentration?: string;
  educations?: EducationEntry[];
  experiences?: ExperienceEntry[];
  clubMemberships?: ClubEntry[];
  skills?: string[];
}

function Avatar({ name, image }: { name: string; image: string }) {
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  if (image) {
    return <img src={image} alt={name} width={48} height={48} className="shrink-0 object-cover" style={{ width: 48, height: 48 }} />;
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-accent-teal/15 text-[14px] font-bold text-accent-teal">
      {initials}
    </div>
  );
}

export function ProfileCardModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [card, setCard] = useState<MemberCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiFetch(`/api/kith/users/card?email=${encodeURIComponent(email)}`).then(async (res) => {
      if (!active) return;
      if (res.ok) setCard(await res.json());
      else setError((await res.json().catch(() => ({}))).error || "Failed to load profile");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [email]);

  // Education lines: "degree · major · concentration" deduped (mirrors contact page).
  const eduLines = card?.educations?.length
    ? [...new Set(card.educations.map((e) => [e.degree, e.major, e.concentration].filter(Boolean).join(" · ")).filter(Boolean))]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md border border-accent-teal/30 bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={card?.name || email} image={card?.image || ""} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-foreground">{card?.name || email}</div>
              {card?.visible && (card.university || card.graduationYear) && (
                <div className="truncate text-[12px] text-muted-foreground">
                  {card.university}
                  {card.university && card.graduationYear ? " · " : ""}
                  {card.graduationYear ? `Class of ${card.graduationYear}` : ""}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-[12px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="py-6 text-[12px] text-red-400">{error}</div>
          ) : !card ? null : !card.visible ? (
            <p className="py-2 text-[12px] text-muted-foreground">
              Add as a friend or join a shared node to see their full profile.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Experience */}
              {card.experiences && card.experiences.length > 0 && (
                <Section title="Experience">
                  <div className="space-y-1.5">
                    {card.experiences.map((x, i) => {
                      const period = formatExperiencePeriod(x);
                      return (
                        <div key={i} className="text-[12px]">
                          <span className="text-foreground">
                            {x.title}
                            {x.title && x.firm ? " @ " : ""}
                            <span className="font-semibold">{x.firm}</span>
                          </span>
                          {period && <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">{period}</span>}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Education */}
              {(eduLines.length > 0 || card.major || card.degrees || card.concentration) && (
                <Section title="Education">
                  {eduLines.length > 0 ? (
                    <div className="space-y-1">
                      {eduLines.map((line, i) => (
                        <div key={i} className="text-[12px] text-foreground">{line}</div>
                      ))}
                    </div>
                  ) : (
                    <dl className="space-y-1 text-[12px]">
                      {card.degrees && <Row label="Degrees" value={card.degrees} />}
                      {card.major && <Row label="Major" value={card.major} />}
                      {card.concentration && <Row label="Concentration" value={card.concentration} />}
                    </dl>
                  )}
                </Section>
              )}

              {/* Clubs */}
              {card.clubMemberships && card.clubMemberships.length > 0 && (
                <Section title="Clubs">
                  <div className="space-y-1">
                    {card.clubMemberships.map((m, i) => {
                      const parts = [m.role, m.club].filter(Boolean);
                      return parts.length ? (
                        <div key={i} className="text-[12px] text-foreground">{parts.join(" · ")}</div>
                      ) : null;
                    })}
                  </div>
                </Section>
              )}

              {/* Skills */}
              {card.skills && card.skills.length > 0 && (
                <Section title="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {card.skills.map((s) => (
                      <span key={s} className="border border-white/[0.12] px-1.5 py-0.5 text-[11px] text-foreground">{s}</span>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
