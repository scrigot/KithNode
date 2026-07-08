export interface MeProfileInput {
  schools?: unknown;
  clubs?: unknown;
  pastFirms?: unknown;
  hometown?: unknown;
  location?: unknown;
  currentWork?: unknown;
  goals?: unknown;
  targetRoles?: unknown;
  targetExpertise?: unknown;
  targetCompanies?: unknown;
  targetLocations?: unknown;
  searchKeywords?: unknown;
  profileNotes?: unknown;
  outreachStyle?: unknown;
  outreachLength?: unknown;
  outreachSignoff?: unknown;
  outreachPositioning?: unknown;
  outreachGoals?: unknown;
  preferredEmailClient?: unknown;
}

export interface MeProfileData {
  schools: string;
  clubs: string;
  pastFirms: string;
  hometown: string;
  location: string;
  currentWork: string;
  goals: string;
  targetRoles: string;
  targetExpertise: string;
  targetCompanies: string;
  targetLocations: string;
  searchKeywords: string;
  profileNotes: string;
  outreachStyle: string;
  outreachLength: string;
  outreachSignoff: string;
  outreachPositioning: string;
  outreachGoals: string;
  preferredEmailClient: string;
}

const MAX_LENGTH = 2000;
const clean = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, MAX_LENGTH) : "");

export function sanitizeProfileInput(input: MeProfileInput): MeProfileData {
  return {
    schools: clean(input.schools),
    clubs: clean(input.clubs),
    pastFirms: clean(input.pastFirms),
    hometown: clean(input.hometown),
    location: clean(input.location),
    currentWork: clean(input.currentWork),
    goals: clean(input.goals),
    targetRoles: clean(input.targetRoles),
    targetExpertise: clean(input.targetExpertise),
    targetCompanies: clean(input.targetCompanies),
    targetLocations: clean(input.targetLocations),
    searchKeywords: clean(input.searchKeywords),
    profileNotes: clean(input.profileNotes),
    outreachStyle: clean(input.outreachStyle),
    outreachLength: clean(input.outreachLength),
    outreachSignoff: clean(input.outreachSignoff),
    outreachPositioning: clean(input.outreachPositioning),
    outreachGoals: clean(input.outreachGoals),
    preferredEmailClient: clean(input.preferredEmailClient),
  };
}
