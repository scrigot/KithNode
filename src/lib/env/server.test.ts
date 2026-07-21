import { afterEach, describe, expect, it } from "vitest";
import { requireServerEnv, resetServerEnvForTests, serverEnv } from "./server";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  resetServerEnvForTests();
});

describe("server environment", () => {
  it("reports all variables required by an integration", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_MONTHLY;
    resetServerEnvForTests();
    expect(() => requireServerEnv("STRIPE_SECRET_KEY", "STRIPE_PRICE_MONTHLY")).toThrow(
      "STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY",
    );
  });

  it("rejects malformed URLs before a provider call", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    resetServerEnvForTests();
    expect(() => serverEnv()).toThrow();
  });

  it("treats blank optional integration variables as unset", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    resetServerEnvForTests();
    expect(serverEnv()).toMatchObject({
      STRIPE_WEBHOOK_SECRET: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    });
  });
});
