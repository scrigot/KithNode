import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "@/lib/env/server";
import type { IntegrationProvider } from "./types";

function encryptionKey() {
  const value = requireServerEnv("OAUTH_TOKEN_ENCRYPTION_KEY").OAUTH_TOKEN_ENCRYPTION_KEY;
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes");
  return key;
}

export function encryptToken(value: string) {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptToken(value: string) {
  if (!value) return "";
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

interface OAuthState {
  userId: string;
  provider: IntegrationProvider;
  redirectUri: string;
  nonce: string;
  expiresAt: number;
}

function stateSecret() {
  return requireServerEnv("AUTH_SECRET").AUTH_SECRET;
}

export function createOAuthState(input: Omit<OAuthState, "nonce" | "expiresAt">) {
  const payload: OAuthState = {
    ...input,
    nonce: randomBytes(16).toString("base64url"),
    expiresAt: Date.now() + 10 * 60_000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(value: string): OAuthState {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid OAuth state");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState;
  if (!payload.userId || !payload.redirectUri || !payload.nonce || payload.expiresAt < Date.now()) throw new Error("Expired OAuth state");
  return payload;
}
