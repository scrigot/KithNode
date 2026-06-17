import { describe, it, expect } from "vitest";
import {
  CREDIT_COSTS,
  CREDIT_ALLOTMENTS,
  ACTIVATION_PATH_COST,
  TRIAL_CREDITS,
} from "./credit-costs";

describe("credit floor", () => {
  // Regression: P0-1 — a new trial user must complete onboarding → Discover →
  // draft → send without hitting a credit wall (tester ran out before drafting).
  it("trial floor clears the activation path with headroom", () => {
    expect(TRIAL_CREDITS).toBeGreaterThanOrEqual(ACTIVATION_PATH_COST);
    // Headroom for several Discover runs, not just one bare pass.
    expect(TRIAL_CREDITS).toBeGreaterThanOrEqual(ACTIVATION_PATH_COST * 2);
  });

  it("beta promo bundle also clears the activation path", () => {
    expect(CREDIT_ALLOTMENTS.betaCode).toBeGreaterThanOrEqual(ACTIVATION_PATH_COST);
  });

  it("activation path cost matches the documented action sum", () => {
    expect(ACTIVATION_PATH_COST).toBe(
      CREDIT_COSTS.resume + CREDIT_COSTS.discover + CREDIT_COSTS.enrich * 15 + CREDIT_COSTS.draft,
    );
  });
});
