import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetServerEnvForTests } from "@/lib/env/server";
import { createOAuthState, decryptToken, encryptToken, verifyOAuthState } from "./crypto";

const original = { ...process.env };
beforeEach(() => {
  process.env.OAUTH_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.AUTH_SECRET = "test-auth-secret";
  resetServerEnvForTests();
});
afterEach(() => {
  process.env = { ...original };
  resetServerEnvForTests();
});

describe("integration secret handling", () => {
  it("encrypts tokens with authenticated encryption", () => {
    const encrypted = encryptToken("refresh-secret");
    expect(encrypted).not.toContain("refresh-secret");
    expect(decryptToken(encrypted)).toBe("refresh-secret");
  });

  it("signs and verifies bounded OAuth state", () => {
    const state = createOAuthState({ userId: "user-1", provider: "google", redirectUri: "http://localhost/callback" });
    expect(verifyOAuthState(state)).toMatchObject({ userId: "user-1", provider: "google" });
    expect(() => verifyOAuthState(`${state}x`)).toThrow("Invalid OAuth state");
  });
});
