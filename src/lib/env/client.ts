import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_ENABLE_KITH_NODES: z.enum(["true", "false"]).optional(),
  NEXT_PUBLIC_ENABLE_OUTREACH_DRAFTS: z.enum(["true", "false"]).optional(),
  NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED: z.enum(["true", "false"]).optional(),
});

export type ClientEnv = z.infer<typeof clientSchema>;

export function clientEnv(): ClientEnv {
  // Keep literal NEXT_PUBLIC_* references so Next can inline them in browser
  // bundles. Never spread process.env into client code.
  return clientSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_ENABLE_KITH_NODES: process.env.NEXT_PUBLIC_ENABLE_KITH_NODES,
    NEXT_PUBLIC_ENABLE_OUTREACH_DRAFTS: process.env.NEXT_PUBLIC_ENABLE_OUTREACH_DRAFTS,
    NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED: process.env.NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED,
  });
}
