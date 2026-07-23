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

const POSTGREST_IN_BATCH_SIZE = 100;

export function chunkRelationshipContactIds(
  contactIds: string[],
  batchSize = POSTGREST_IN_BATCH_SIZE,
) {
  const size = Math.max(1, Math.floor(batchSize));
  return Array.from(
    { length: Math.ceil(contactIds.length / size) },
    (_, index) => contactIds.slice(index * size, (index + 1) * size),
  );
}

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
  // PostgREST encodes `.in()` filters into the request URL. A user with
  // hundreds of contacts can otherwise exceed the proxy URL limit and turn
  // `/who-to-contact` into an opaque HTTP 400. Keep each request bounded while
  // preserving one tenant-scoped relationship view.
  const batches = chunkRelationshipContactIds(contactIds);
  const batchResults = await Promise.all(batches.map(async (batch) => {
    const [connectionsResult, evidenceResult] = await Promise.all([
      supabase
        .from("Connection")
        .select("alumniId,status")
        .eq("userId", userId)
        .in("alumniId", batch),
      supabase
        .from("RelationshipEvidence")
        .select("contactId,state,relationshipType,source,summary,confidence,verifiedByUser,effectiveAt,expiresAt")
        .eq("userId", userId)
        .in("contactId", batch),
    ]);
    if (connectionsResult.error) throw new Error(connectionsResult.error.message);
    if (evidenceResult.error) throw new Error(evidenceResult.error.message);
    return {
      connections: (connectionsResult.data || []) as ConnectionRow[],
      evidence: (evidenceResult.data || []) as EvidenceRow[],
    };
  }));

  const connections = new Map(
    batchResults.flatMap((result) => result.connections).map((row) => [row.alumniId, row.status]),
  );
  const evidence = new Map<string, EvidenceRow[]>();
  for (const row of batchResults.flatMap((result) => result.evidence)) {
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
