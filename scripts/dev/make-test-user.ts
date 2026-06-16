#!/usr/bin/env tsx
/**
 * DEV-ONLY: create / refresh a throwaway test user plus a fixed promo (access)
 * code so the activation path can be dogfooded from a clean slate.
 *
 *   - Upserts User test+activation@kithnode.ai: trial status, TRIAL_CREDITS
 *     credits, tutorialDoneAt = null, profile fields blanked.
 *   - Upserts PromoCode KITH-DEV: 150 credits, 7 days, plan "trial", unredeemed.
 *
 * Usage:
 *   npm run dev:test-user
 *   # or: npx tsx scripts/dev/make-test-user.ts
 *
 * Env: reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
 * .env.local (same names as src/lib/supabase.ts). The service-role key is
 * required so the upserts bypass RLS.
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { TRIAL_CREDITS } from "../../src/lib/credit-costs";

const TEST_EMAIL = "test+activation@kithnode.ai";
const ACCESS_CODE = "KITH-DEV";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — aborting.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertTestUser(): Promise<void> {
  // Does the row already exist? Upsert on email (no unique constraint there, so
  // we branch manually to stay portable).
  const { data: existing } = await supabase
    .from("User")
    .select("id")
    .eq("email", TEST_EMAIL)
    .maybeSingle();

  const fields = {
    email: TEST_EMAIL,
    name: "Activation Tester",
    subscriptionStatus: "trial",
    credits: TRIAL_CREDITS,
    tutorialDoneAt: null,
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    clubs: "",
    clubMemberships: "",
    skills: "",
    educations: "",
    experiences: "",
    targetIndustry: "",
    targetIndustries: "",
    targetFirms: "",
    targetLocations: "",
    onboardingGoal: "",
    onboardingPain: "",
    onboardingTimeline: "",
  };

  if (existing) {
    const { error } = await supabase
      .from("User")
      .update(fields)
      .eq("email", TEST_EMAIL);
    if (error) throw new Error(`User update failed: ${error.message}`);
  } else {
    const { error } = await supabase.from("User").insert(fields);
    if (error) throw new Error(`User insert failed: ${error.message}`);
  }
}

async function upsertPromoCode(): Promise<void> {
  const { data: existing } = await supabase
    .from("PromoCode")
    .select("id")
    .eq("code", ACCESS_CODE)
    .maybeSingle();

  const fields = {
    code: ACCESS_CODE,
    days: 7,
    credits: 150,
    plan: "trial",
    note: "dev throwaway access code (scripts/dev/make-test-user.ts)",
    redeemedByEmail: null,
    redeemedAt: null,
  };

  if (existing) {
    const { error } = await supabase
      .from("PromoCode")
      .update(fields)
      .eq("code", ACCESS_CODE);
    if (error) throw new Error(`PromoCode update failed: ${error.message}`);
  } else {
    const { error } = await supabase.from("PromoCode").insert(fields);
    if (error) throw new Error(`PromoCode insert failed: ${error.message}`);
  }
}

async function main(): Promise<void> {
  await upsertTestUser();
  await upsertPromoCode();

  console.log("");
  console.log("Throwaway test user ready:");
  console.log(`  email:       ${TEST_EMAIL}`);
  console.log(`  access code: ${ACCESS_CODE}`);
  console.log(`  credits:     ${TRIAL_CREDITS} (trial)`);
  console.log("");
  console.log(
    `Sign in as ${TEST_EMAIL}, redeem code ${ACCESS_CODE}, then walk onboarding -> Discover -> draft.`,
  );
  console.log("");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
