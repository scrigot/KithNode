export type RelationshipState = "verified" | "potential" | "none" | "unavailable";

export type RelationshipEvidenceInput = {
  state?: string | null;
  relationshipType?: string | null;
  source?: string | null;
  summary?: string | null;
  confidence?: number | null;
  verifiedByUser?: boolean | null;
  effectiveAt?: string | Date | null;
  expiresAt?: string | Date | null;
};

export type RelationshipContactInput = {
  id: string;
  name: string;
  title?: string | null;
  firmName?: string | null;
  linkedInUrl?: string | null;
  affiliations?: string | null;
  source?: string | null;
  isFriend?: boolean | null;
  lastSpokenAt?: string | Date | null;
  connectionStatus?: string | null;
  evidence?: RelationshipEvidenceInput[];
};

export type ClassifiedRelationship = {
  contactId: string;
  name: string;
  title: string;
  firmName: string;
  linkedInUrl: string;
  state: Exclude<RelationshipState, "none" | "unavailable">;
  relationshipType: string;
  confidence: number;
  evidence: string[];
  source: string;
  effectiveAt: string | null;
};

const VERIFIED_CONNECTION_STATES = new Set([
  "accepted",
  "connected",
  "meeting_set",
  "responded",
]);

function dateIso(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isCurrent(evidence: RelationshipEvidenceInput, now: Date) {
  const expiresAt = dateIso(evidence.expiresAt);
  return !expiresAt || new Date(expiresAt) > now;
}

/**
 * Canonical conservative relationship classifier.
 *
 * A contact/profile import, shared school, same employer, model score, or
 * inferred similarity never becomes a verified relationship. Verification
 * needs explicit user confirmation or a recorded real interaction.
 */
export function classifyRelationship(
  contact: RelationshipContactInput,
  now = new Date(),
): ClassifiedRelationship {
  const currentEvidence = (contact.evidence || []).filter((item) => isCurrent(item, now));
  const verified = currentEvidence
    .filter((item) =>
      item.state === "verified" &&
      (item.verifiedByUser ||
        ["interaction", "manual", "user_confirmed"].includes(String(item.source || "").toLowerCase())),
    )
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0));

  const lastSpokenAt = dateIso(contact.lastSpokenAt);
  const connectionStatus = String(contact.connectionStatus || "").toLowerCase();
  const evidence: string[] = [];
  let state: "verified" | "potential" = "potential";
  let relationshipType = "potential contact";
  let confidence = 0.45;
  let source = String(contact.source || "profile_import");
  let effectiveAt: string | null = null;

  if (verified.length) {
    const strongest = verified[0];
    state = "verified";
    relationshipType = strongest.relationshipType || "confirmed relationship";
    confidence = Math.max(0.8, Math.min(1, Number(strongest.confidence || 0.8)));
    source = strongest.source || "user_confirmed";
    effectiveAt = dateIso(strongest.effectiveAt);
    evidence.push(strongest.summary || "Relationship confirmed by the user.");
  } else if (contact.isFriend) {
    state = "verified";
    relationshipType = "friend";
    confidence = 1;
    source = "user_profile";
    evidence.push("Marked as a friend in KithNode.");
  } else if (lastSpokenAt) {
    state = "verified";
    relationshipType = "recorded interaction";
    confidence = 0.9;
    source = "interaction";
    effectiveAt = lastSpokenAt;
    evidence.push(`Last interaction recorded ${new Date(lastSpokenAt).toLocaleDateString("en-US")}.`);
  } else if (VERIFIED_CONNECTION_STATES.has(connectionStatus)) {
    state = "verified";
    relationshipType = connectionStatus === "meeting_set" ? "meeting scheduled" : "recorded outreach";
    confidence = connectionStatus === "meeting_set" ? 0.95 : 0.85;
    source = "interaction";
    evidence.push(`Recorded relationship status: ${connectionStatus.replaceAll("_", " ")}.`);
  } else {
    const potential = currentEvidence
      .filter((item) => item.state === "potential")
      .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0];
    if (potential) {
      relationshipType = potential.relationshipType || relationshipType;
      confidence = Math.max(0.25, Math.min(0.79, Number(potential.confidence || confidence)));
      source = potential.source || source;
      effectiveAt = dateIso(potential.effectiveAt);
      evidence.push(potential.summary || "Possible relationship path; not yet verified.");
    } else {
      evidence.push("Profile is in your private network data, but no direct interaction is verified.");
    }
  }

  return {
    contactId: contact.id,
    name: contact.name,
    title: String(contact.title || ""),
    firmName: String(contact.firmName || ""),
    linkedInUrl: String(contact.linkedInUrl || ""),
    state,
    relationshipType,
    confidence,
    evidence,
    source,
    effectiveAt,
  };
}

export function relationshipStateRank(state: RelationshipState) {
  return state === "verified" ? 3 : state === "potential" ? 2 : state === "none" ? 1 : 0;
}
