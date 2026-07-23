import "server-only";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/supabase-paginate";
import { canonicalCompanyKey } from "@/lib/jobs/catalog";
import {
  classifyRelationship,
  type ClassifiedRelationship,
  type RelationshipEvidenceInput,
} from "./classifier";

type ContactRow = {
  id: string;
  name: string;
  firmName: string;
  title: string;
  linkedInUrl: string;
  affiliations: string;
  source: string;
  isFriend: boolean;
  lastSpokenAt: string | null;
};

type ConnectionRow = {
  alumniId: string;
  status: string;
};

type EvidenceRow = RelationshipEvidenceInput & {
  contactId: string;
};

export async function relationshipsAtCompanies(
  userId: string,
  companies: string[],
): Promise<Map<string, ClassifiedRelationship[]>> {
  const companyKeys = new Set(companies.map(canonicalCompanyKey).filter(Boolean));
  const contacts = await fetchAllRows<ContactRow>(() =>
    supabase
      .from("AlumniContact")
      .select("id,name,firmName,title,linkedInUrl,affiliations,source,isFriend,lastSpokenAt")
      .eq("importedByUserId", userId)
      .order("id"),
  );
  const relevant = contacts.filter((contact) => companyKeys.has(canonicalCompanyKey(contact.firmName)));
  if (!relevant.length) return new Map();

  const contactIds = relevant.map((contact) => contact.id);
  const [connectionsResult, evidenceResult] = await Promise.all([
    supabase
      .from("Connection")
      .select("alumniId,status")
      .eq("userId", userId)
      .in("alumniId", contactIds),
    supabase
      .from("RelationshipEvidence")
      .select("contactId,state,relationshipType,source,summary,confidence,verifiedByUser,effectiveAt,expiresAt")
      .eq("userId", userId)
      .in("contactId", contactIds),
  ]);
  if (connectionsResult.error) throw new Error(connectionsResult.error.message);
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);

  const connections = new Map(
    ((connectionsResult.data || []) as ConnectionRow[]).map((row) => [row.alumniId, row.status]),
  );
  const evidence = new Map<string, EvidenceRow[]>();
  for (const row of (evidenceResult.data || []) as EvidenceRow[]) {
    evidence.set(row.contactId, [...(evidence.get(row.contactId) || []), row]);
  }

  const grouped = new Map<string, ClassifiedRelationship[]>();
  for (const contact of relevant) {
    const key = canonicalCompanyKey(contact.firmName);
    const classified = classifyRelationship({
      ...contact,
      connectionStatus: connections.get(contact.id),
      evidence: evidence.get(contact.id) || [],
    });
    grouped.set(key, [...(grouped.get(key) || []), classified]);
  }

  for (const [key, rows] of grouped) {
    grouped.set(
      key,
      rows.sort((a, b) =>
        (a.state === b.state ? b.confidence - a.confidence : a.state === "verified" ? -1 : 1)),
    );
  }
  return grouped;
}
