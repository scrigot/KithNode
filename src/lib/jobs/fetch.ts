import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { URL } from "node:url";

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 8_000;

function isPrivateIp(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export async function assertPublicHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP(S) career URLs are allowed");
  if (url.username || url.password) throw new Error("Credential-bearing URLs are not allowed");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Private-network URLs are not allowed");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("Private-network URLs are not allowed");
  return url;
}

export async function safeFetchText(rawUrl: string, init?: RequestInit) {
  const url = await assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "error",
      headers: { "User-Agent": "KithNode-JobDiscovery/1.0", Accept: "application/json,text/html", ...init?.headers },
    });
    if (!response.ok) throw new Error(`Career source returned ${response.status}`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("Career source response is too large");
    const reader = response.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Career source response is too large");
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  } finally {
    clearTimeout(timeout);
  }
}

export function textOnly(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000);
}
