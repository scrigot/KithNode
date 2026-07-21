import "server-only";
import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalNonEmpty = z.preprocess(emptyToUndefined, nonEmpty.optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalNonEmpty,
  DIRECT_URL: optionalNonEmpty,
  AUTH_SECRET: optionalNonEmpty,
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  GOOGLE_OAUTH_CLIENT_ID: optionalNonEmpty,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalNonEmpty,
  MICROSOFT_CLIENT_ID: optionalNonEmpty,
  MICROSOFT_CLIENT_SECRET: optionalNonEmpty,
  MICROSOFT_TENANT_ID: optionalNonEmpty,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmpty,
  STRIPE_SECRET_KEY: optionalNonEmpty,
  STRIPE_PRICE_MONTHLY: optionalNonEmpty,
  STRIPE_PRICE_ANNUAL: optionalNonEmpty,
  STRIPE_WEBHOOK_SECRET: optionalNonEmpty,
  AI_GATEWAY_API_KEY: optionalNonEmpty,
  ANTHROPIC_API_KEY: optionalNonEmpty,
  AI_DEFAULT_MODEL: optionalNonEmpty,
  AI_FAST_MODEL: optionalNonEmpty,
  AI_FALLBACK_MODEL: optionalNonEmpty,
  PDL_API_KEY: optionalNonEmpty,
  BRAVE_SEARCH_API_KEY: optionalNonEmpty,
  ENABLE_CAREER_SKILLS: optionalNonEmpty,
  ENABLE_JOB_DISCOVERY: optionalNonEmpty,
  CRON_SECRET: optionalNonEmpty,
  RESEND_API_KEY: optionalNonEmpty,
  RESEND_FROM_EMAIL: optionalEmail,
  RESEND_WEBHOOK_SECRET: optionalNonEmpty,
  OAUTH_TOKEN_ENCRYPTION_KEY: optionalNonEmpty,
  NEXT_PUBLIC_APP_URL: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let parsed: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!parsed) parsed = serverSchema.parse(process.env);
  return parsed;
}

export function requireServerEnv<K extends keyof ServerEnv>(
  ...keys: K[]
): ServerEnv & { [P in K]-?: Exclude<ServerEnv[P], undefined> } {
  const env = serverEnv();
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(", ")}`);
  }
  return env as ServerEnv & { [P in K]-?: Exclude<ServerEnv[P], undefined> };
}

export function databaseUrl(): string {
  return requireServerEnv("DATABASE_URL").DATABASE_URL;
}

export function stripeEnv() {
  return requireServerEnv("STRIPE_SECRET_KEY", "STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_ANNUAL");
}

export function supabaseServerEnv() {
  return requireServerEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
}

export function resetServerEnvForTests() {
  parsed = undefined;
}
