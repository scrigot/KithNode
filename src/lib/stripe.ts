import Stripe from "stripe";
import { requireServerEnv } from "@/lib/env/server";

let _stripe: Stripe | null = null;

/** Lazily initializes the Stripe client so builds don't fail without the key */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = requireServerEnv("STRIPE_SECRET_KEY").STRIPE_SECRET_KEY;
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Stripe Price IDs — set these in your environment variables.
 * Create products in the Stripe Dashboard and copy the price IDs here.
 */
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || "",
  annual: process.env.STRIPE_PRICE_ANNUAL || "",
} as const;

/** Free trial duration in days */
export const TRIAL_DAYS = 7;
