import { randomUUID } from "crypto";

/** Text primary key for kith tables (these columns have no DB default). */
export function genId(): string {
  return randomUUID();
}

/** Short, human-shareable invite code (no ambiguous chars). */
export function genInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1
  const bytes = randomUUID().replace(/-/g, "");
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[parseInt(bytes[i], 16) % alphabet.length];
  }
  return out;
}
