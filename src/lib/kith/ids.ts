import { randomBytes, randomUUID } from "crypto";

/** Text primary key for kith tables (these columns have no DB default). */
export function genId(): string {
  return randomUUID();
}

/**
 * Invite code — a security token (anyone holding it can join the Node and see
 * its pooled contacts), so it must be unguessable. CSPRNG-backed base32; the
 * 32-char alphabet divides 256 evenly, so `byte % 32` is bias-free. 16 chars ×
 * 5 bits ≈ 80 bits of entropy. (Codes can be rotated; join is auth-gated.)
 */
export function genInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no I,O,0,1
  let out = "";
  for (const b of randomBytes(16)) out += alphabet[b % 32];
  return out;
}
