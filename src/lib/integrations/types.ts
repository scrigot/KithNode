export const INTEGRATION_PROVIDERS = ["google", "microsoft"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export function isIntegrationProvider(value: unknown): value is IntegrationProvider {
  return typeof value === "string" && INTEGRATION_PROVIDERS.includes(value as IntegrationProvider);
}

export interface ProviderProfile {
  id: string;
  email: string;
  name: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string;
}

export interface ConnectedMessage {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  snippet: string;
  webUrl?: string;
}

export interface ConnectedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location: string;
  webUrl?: string;
}
