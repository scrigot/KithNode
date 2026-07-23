import "server-only";
import { relationshipsAtCompanies } from "@/lib/relationships/repository";

export interface WarmPath {
  intermediaryName: string;
  intermediaryRelation: string;
  intermediaryLinkedInUrl: string;
  firmName: string;
  title: string;
  evidence: string[];
}

/**
 * Find verified warm paths to a contact's firm.
 *
 * Simply importing a profile or sharing a school/company does not qualify.
 * Potential paths remain visible in research results, but this API only returns
 * relationships backed by user confirmation or a recorded interaction.
 */
export async function findWarmPaths(
  userId: string,
  contactFirmName: string,
): Promise<WarmPath[]> {
  if (!contactFirmName) return [];
  const grouped = await relationshipsAtCompanies(userId, [contactFirmName]);
  const relationships = [...grouped.values()].flat().filter((relationship) => relationship.state === "verified");
  return relationships.map((relationship) => ({
    intermediaryName: relationship.name,
    intermediaryRelation: relationship.relationshipType,
    intermediaryLinkedInUrl: relationship.linkedInUrl,
    firmName: relationship.firmName,
    title: relationship.title,
    evidence: relationship.evidence,
  }));
}
