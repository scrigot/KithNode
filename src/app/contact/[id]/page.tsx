"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { OutreachSheet } from "@/app/dashboard/contacts/outreach-sheet";
import { TagEditor } from "./tag-editor";
import { FieldEditor } from "./field-editor";
import { EditProfileModal } from "./edit-profile-modal";
import { trackEvent } from "@/lib/posthog";
import { ALL_TRACKS, CAREER_TRACKS, roleToTrack } from "@/lib/data/career-tracks";
import type { ContactDetail } from "@/lib/api";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-green-500/20 text-green-400 border-green-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const AFFILIATION_COLORS: Record<string, string> = {
  "Chi Phi": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Kenan-Flagler": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "UNC Alumni": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "UNC Faculty": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Duke: "bg-blue-700/20 text-blue-300 border-blue-700/30",
  "NC Local": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Consulting Background": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const SIGNAL_ICONS: Record<string, string> = {
  funding: "$$",
  hiring: ">>",
  tech_stack: "<>",
  news: "!!",
};

// Read-only label/value row for the DETAILS card. Empty values render a muted
// "Not set" (em-dash-free) so the user can see at a glance what's blank without
// the row looking broken. Editing happens in the Edit Profile modal.
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  const display = value?.trim();
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={`text-right ${display ? "text-foreground" : "text-muted-foreground/50"}`}
      >
        {display || "Not set"}
      </dd>
    </div>
  );
}

function ScoreSection({ score }: { score: ContactDetail["score"] }) {
  if (!score) return null;
  return (
    <div className="border border-border bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        SCORE BREAKDOWN
      </h3>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-foreground">
          {Math.round(score.total_score)}
        </span>
        <span className="text-sm text-muted-foreground">/100</span>
        <Badge
          variant="outline"
          className={`ml-2 text-[10px] font-bold tracking-wider ${TIER_STYLES[score.tier] || TIER_STYLES.cold}`}
        >
          {score.tier.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">FIT</span>
            <span className="tabular-nums text-accent-blue">
              {Math.round(score.fit_score)}/50
            </span>
          </div>
          <Progress
            value={(score.fit_score / 50) * 100}
            className="h-1.5 bg-muted [&>div]:bg-accent-blue"
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">SIGNAL</span>
            <span className="tabular-nums text-accent-amber">
              {Math.round(score.signal_score)}/30
            </span>
          </div>
          <Progress
            value={(score.signal_score / 30) * 100}
            className="h-1.5 bg-muted [&>div]:bg-accent-amber"
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">ENGAGEMENT</span>
            <span className="tabular-nums text-accent-green">
              {Math.round(score.engagement_score)}/20
            </span>
          </div>
          <Progress
            value={(score.engagement_score / 20) * 100}
            className="h-1.5 bg-muted [&>div]:bg-accent-green"
          />
        </div>
      </div>
    </div>
  );
}

// Manual identity override. One click PATCHes personType; the route rescores
// the contact server-side, then onSaved refetches so the affiliation chips +
// score reflect the new identity. AUTO ('') hands WHO-detection back to the
// title/education heuristics.
const PERSON_TYPES: { value: string; label: string }[] = [
  { value: "", label: "AUTO" },
  { value: "alum", label: "ALUM" },
  { value: "student", label: "STUDENT" },
  { value: "professor", label: "PROFESSOR" },
];

function TypeToggle({
  contactId,
  value,
  onSaved,
}: {
  contactId: string;
  value: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function select(next: string) {
    if (next === value || saving) return;
    setSaving(true);
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personType: next }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="mb-3">
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        TYPE
      </h3>
      <div className="inline-flex border border-border" role="group" aria-label="Contact type">
        {PERSON_TYPES.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value || "auto"}
              type="button"
              disabled={saving}
              onClick={() => select(t.value)}
              aria-pressed={active}
              className={`border-r border-border px-2 py-1 text-[10px] font-bold tracking-wider transition-colors last:border-r-0 disabled:opacity-50 ${
                active
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Track + role editor over the taxonomy. The track <select> gates the role
// <select> options (roles shown belong to the chosen track); clearing the track
// clears the role. Both persist via the same PATCH the rest of the page uses;
// the route validates them as closed sets and rescores server-side. Changing the
// track to one that doesn't own the current role auto-clears the role in the same
// PATCH so the two never disagree.
function TrackRoleEditor({
  contactId,
  track,
  role,
  onSaved,
}: {
  contactId: string;
  track: string;
  role: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function patch(body: { track: string; role: string }) {
    setSaving(true);
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  function onTrackChange(nextTrack: string) {
    if (nextTrack === track) return;
    // Keep the role only if it still belongs to the new track; otherwise clear it.
    const keepRole = nextTrack && roleToTrack(role) === nextTrack ? role : "";
    void patch({ track: nextTrack, role: keepRole });
  }

  function onRoleChange(nextRole: string) {
    if (nextRole === role) return;
    // Setting a role implies its track (handles the role-without-track case).
    void patch({ track: nextRole ? roleToTrack(nextRole) : track, role: nextRole });
  }

  const roleOptions = track && track in CAREER_TRACKS
    ? CAREER_TRACKS[track as keyof typeof CAREER_TRACKS]
    : [];

  return (
    <div className="mb-3">
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        CAREER TRACK
      </h3>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Career track"
          disabled={saving}
          value={track}
          onChange={(e) => onTrackChange(e.target.value)}
          className="h-6 border border-border bg-background px-1.5 text-[10px] text-foreground focus:border-accent-blue focus:outline-none disabled:opacity-50"
        >
          <option value="">Track —</option>
          {ALL_TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Career role"
          disabled={saving || !track}
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="h-6 border border-border bg-background px-1.5 text-[10px] text-foreground focus:border-accent-blue focus:outline-none disabled:opacity-50"
        >
          <option value="">Role —</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function BackLink({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  // Use history traversal when the user arrived from within the app — the
  // browser/App Router will restore scroll position natively. Fall back to a
  // hard link for direct/deep links (no history entry to go back to).
  const canGoBack =
    typeof window !== "undefined" && window.history.length > 1;

  if (canGoBack) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="text-[10px] text-muted-foreground hover:text-primary"
      >
        &lt; {backLabel}
      </button>
    );
  }
  return (
    <Link href={backHref} className="text-[10px] text-muted-foreground hover:text-primary">
      &lt; {backLabel}
    </Link>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const fromImport = searchParams.get("from") === "import";
  const backHref = fromImport ? "/dashboard/import" : "/dashboard/contacts";
  const backLabel = fromImport ? "BACK TO IMPORT" : "BACK TO SIGNALS";
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutreach, setShowOutreach] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(
    searchParams.get("edit") === "1",
  );
  const [tab, setTab] = useState<"signals" | "profile">("signals");
  // Two-click delete for the contact page header.
  const [deleteState, setDeleteState] = useState<"idle" | "armed">("idle");
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the armed delete state after 3s or on outside interaction.
  useEffect(() => {
    if (deleteState !== "armed") return;
    deleteTimerRef.current = setTimeout(() => setDeleteState("idle"), 3000);
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, [deleteState]);

  async function handlePageDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (deleteState === "idle") {
      setDeleteState("armed");
    } else {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setDeleteState("idle");
      await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      router.push("/dashboard/contacts");
    }
  }

  // Refetch the contact after a field/type edit so the rescored affiliations +
  // score (computed server-side in the PATCH) replace the stale panel data.
  const loadContact = useCallback(() => {
    return fetch(`/api/contacts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Contact not found");
        return res.json();
      })
      .then((data) => {
        setContact(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted" />
          <div className="h-8 w-64 bg-muted" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-muted" />
            <div className="h-48 bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-background p-6">
        <BackLink backHref={backHref} backLabel={backLabel} />
        <div className="mt-8 border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          {error || "Contact not found"}
        </div>
      </div>
    );
  }

  // Read structured education rows + flat fallback fields defensively so this
  // compiles regardless of api.ts version.
  const contactExt = contact as {
    degrees?: string;
    concentration?: string;
    educations?: { major: string; degree: string; concentration: string }[];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BackLink backHref={backHref} backLabel={backLabel} />
            {/* Two-click-confirm delete */}
            {deleteState === "armed" ? (
              <button
                type="button"
                onClick={handlePageDelete}
                className="border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/10"
              >
                CONFIRM?
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePageDelete}
                className="flex items-center text-muted-foreground/40 transition-colors hover:text-red-400"
                title="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1 [&_button]:!text-xl [&_button]:!font-bold [&_input]:!text-xl [&_input]:!font-bold [&_p]:flex [&_p]:items-center [&_p]:gap-1">
            <FieldEditor
              contactId={contact.id}
              field="name"
              label=""
              initialValue={contact.name || ""}
              placeholder="Add name"
              onSaved={loadContact}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {contact.title}
            {contact.title && contact.company.name ? " @ " : ""}
            <span className="text-foreground">{contact.company.name}</span>
          </p>
          {contact.company.location && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {contact.company.location}
            </p>
          )}
        </div>
        {contact.outreach_history.some((o) => o.status === "replied") ? (
          <Badge
            variant="outline"
            className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"
          >
            AUTOGUARD ACTIVE
          </Badge>
        ) : (
          <Button
            variant="outline"
            className="text-xs text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => setShowOutreach(true)}
          >
            DRAFT OUTREACH
          </Button>
        )}
      </div>

      <OutreachSheet
        contactId={contact.id}
        contactName={contact.name}
        contactEmail={contact.email}
        open={showOutreach}
        onClose={() => setShowOutreach(false)}
      />

      {showEditProfile && (
        <EditProfileModal
          contact={contact}
          onSaved={loadContact}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      <Separator className="mb-4" />

      {/* Tab bar — matches the discover page segment toggle. Active tab lives in
          component state only; no URL change. */}
      <div className="mb-4 flex overflow-hidden border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setTab("signals")}
          aria-pressed={tab === "signals"}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            tab === "signals"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Score &amp; Signals
        </button>
        <button
          type="button"
          onClick={() => setTab("profile")}
          aria-pressed={tab === "profile"}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            tab === "profile"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Profile
        </button>
      </div>

      {/* ─── Tab: SCORE & SIGNALS ─── score breakdown (hugs its content),
          signal timeline, outreach history stacked dense. ─── */}
      {tab === "signals" && (
        <div className="space-y-4">
          {/* Score */}
          <ScoreSection score={contact.score} />

          {/* Signals */}
          <div className="border border-border bg-card p-4">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              SIGNAL TIMELINE
            </h3>
            {contact.signals.length > 0 ? (
              <div className="space-y-2">
                {contact.signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="w-5 font-bold text-accent-amber">
                      {SIGNAL_ICONS[signal.signal_type] || "**"}
                    </span>
                    <div className="flex-1">
                      <p className="text-foreground">{signal.description}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>Strength: {signal.strength}/10</span>
                        {signal.source_url && (
                          <a
                            href={signal.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-blue hover:underline"
                          >
                            source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No signals detected yet
              </p>
            )}
          </div>

          {/* Outreach History */}
          <div className="border border-border bg-card p-4">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              OUTREACH HISTORY
            </h3>
            {contact.outreach_history.length > 0 ? (
              <div className="space-y-3">
                {contact.outreach_history.map((outreach) => {
                  const isLocked = outreach.status === "replied";
                  const isSent = outreach.status === "sent";
                  return (
                    <div
                      key={outreach.id}
                      className={`border p-2 text-xs ${isLocked ? "border-amber-500/30 bg-amber-500/5" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground">
                          {outreach.email_subject || "Untitled draft"}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isLocked
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : isSent
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }`}
                        >
                          {isLocked ? "LOCKED" : outreach.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {outreach.created_at}
                      </p>
                      {isSent && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-6 text-[10px] text-amber-400 hover:bg-amber-500/20"
                          onClick={async () => {
                            await fetch(
                              `/api/contacts/${outreach.id}/status`,
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  status: "replied",
                                }),
                              },
                            );
                            trackEvent("autoguard_locked", {
                              contact_id: contact.id,
                              contact_name: contact.name,
                            });
                            // Reload to show AutoGuard state
                            window.location.reload();
                          }}
                        >
                          MARK AS RESPONDED
                        </Button>
                      )}
                      {isLocked && (
                        <p className="mt-1 text-[10px] text-amber-400">
                          AutoGuard active — AI automation disabled
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No outreach history
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: PROFILE ─── type toggle, affiliations, all editable field
          rows, mutual/LinkedIn links, and the tags editor. ─── */}
      {tab === "profile" && (
      <div className="grid items-start grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT — Classification & signals */}
        <div className="border border-border bg-card p-4">
          <TypeToggle
            contactId={contact.id}
            value={contact.person_type || ""}
            onSaved={loadContact}
          />

          <TrackRoleEditor
            contactId={contact.id}
            track={contact.track || ""}
            role={contact.role || ""}
            onSaved={loadContact}
          />

          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            AFFILIATIONS
          </h3>
          {contact.affiliations.length > 0 ? (
            <div className="space-y-2">
              {contact.affiliations.map((aff) => (
                <div
                  key={aff.id}
                  className="flex items-center justify-between"
                >
                  <Badge
                    variant="outline"
                    className={`text-xs ${AFFILIATION_COLORS[aff.name] || "bg-zinc-500/20 text-zinc-400"}`}
                  >
                    {aff.name}
                  </Badge>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    +{aff.boost}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No shared affiliations detected
            </p>
          )}

          <Separator className="my-3" />
          <TagEditor contactId={contact.id} initialTags={contact.tags ?? []} />
        </div>

        {/* RIGHT — Details (read-only; edited via the Edit Profile modal) */}
        <div className="border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              DETAILS
            </h3>
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="inline-flex items-center gap-1.5 border border-white/[0.12] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Pencil className="h-3 w-3" />
              EDIT PROFILE
            </button>
          </div>
          <dl className="space-y-1.5 text-xs">
            <DetailRow label="Title" value={contact.title} />
            <DetailRow label="Company" value={contact.company.name} />
            {contact.person_type === "professor" && (
              <DetailRow label="Teaches at" value={contact.university} />
            )}
            <DetailRow label="Education" value={contact.education} />
            {/* Render structured education rows when present; fall back to flat fields. */}
            {contactExt.educations && contactExt.educations.length > 0 ? (
              <div className="space-y-0.5">
                <dt className="text-muted-foreground">Degrees / Programs</dt>
                {contactExt.educations.map((edu, i) => {
                  const parts = [edu.degree, edu.major, edu.concentration].filter(Boolean);
                  if (!parts.length) return null;
                  return (
                    <dd key={i} className="text-right text-foreground">
                      {parts.join(" · ")}
                    </dd>
                  );
                })}
              </div>
            ) : (
              <>
                <DetailRow label="Major" value={contact.major} />
                {contactExt.degrees?.trim() && (
                  <DetailRow label="Degrees" value={contactExt.degrees} />
                )}
                {contactExt.concentration?.trim() && (
                  <DetailRow label="Concentration" value={contactExt.concentration} />
                )}
              </>
            )}
            {/* Minor is not part of education rows — always render it. */}
            <DetailRow label="Minor" value={contact.minor} />
            <DetailRow label="Skills" value={contact.skills} />
            <DetailRow label="Past employers" value={contact.past_firms} />
            <DetailRow label="Location (current)" value={contact.linkedin_location} />
            <DetailRow label="Hometown" value={contact.hometown} />
            <DetailRow label="High School" value={contact.high_school} />
            <DetailRow label="Greek Life" value={contact.greek_org} />
            <DetailRow label="Clubs" value={contact.clubs} />
            <DetailRow label="Passions" value={contact.passions} />
          </dl>
          <Separator className="my-3" />
          <div className="space-y-1.5 text-xs">
            <p>
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.company.name)}&network=%5B%22F%22%5D`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                Check Mutual Connections
              </a>
            </p>
            <p>
              <span className="text-muted-foreground">LinkedIn: </span>
              {contact.linkedin_url ? (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  View Profile
                </a>
              ) : (
                <span className="text-muted-foreground/60">
                  No LinkedIn on file
                </span>
              )}
            </p>
            {contact.email && (
              <p>
                <span className="text-muted-foreground">Email: </span>
                <span className="text-foreground">{contact.email}</span>
                {contact.email_status && (
                  <span className="ml-1 text-muted-foreground">
                    ({contact.email_status})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
