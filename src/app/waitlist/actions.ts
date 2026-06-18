"use server";

import { supabase } from "@/lib/supabase";
import { sendWaitlistConfirmation } from "@/lib/resend";
import { notifyFounder } from "@/lib/notify";
import { headers } from "next/headers";

export type WaitlistInput = {
  email: string;
  full_name: string;
  university: string;
  grad_year: number;
  target_track: string;
  linkedin_url?: string;
  greek_affiliation?: string;
  current_prep?: string;
  referred_by?: string;
};

export type WaitlistResult = { ok: true; ref_code: string } | { ok: false; error: string };

export async function submitWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  if (!input.email || !input.full_name || !input.university || !input.target_track) {
    return { ok: false, error: "Missing required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (!Number.isInteger(input.grad_year) || input.grad_year < 2025 || input.grad_year > 2030) {
    return { ok: false, error: "Pick a graduation year between 2025 and 2030." };
  }

  const refCode = Math.random().toString(36).slice(2, 8);

  const payload = {
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    university: input.university.trim(),
    grad_year: input.grad_year,
    target_track: input.target_track,
    linkedin_url: input.linkedin_url?.trim() || null,
    greek_affiliation: input.greek_affiliation?.trim() || null,
    current_prep: input.current_prep?.trim() || null,
    referred_by: input.referred_by?.trim() || null,
    ref_code: refCode,
  };

  const { error } = await supabase.from("waitlist_signups").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You're already on the list. Sam will reach out soon." };
    }
    return { ok: false, error: "Something broke on our end. Try again in a minute." };
  }

  // Best-effort founder ping: the signup row is already saved, so a Slack
  // failure must never fail the request.
  await notifyFounder({
    event: "access_request",
    title: "🟢 New access request",
    lines: [
      `${payload.full_name} · ${payload.email}`,
      `${payload.university} · ${payload.target_track} · class of ${payload.grad_year}`,
    ],
  }).catch(() => {});

  const h = await headers();
  const host = h.get("host") || "kithnode.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const referralLink = `${proto}://${host}/?ref=${refCode}`;

  // Await delivery so a failure is recorded, not silently swallowed. The signup
  // row is already saved; email tracking is best-effort and never blocks success.
  const emailResult = await sendWaitlistConfirmation({
    email: payload.email,
    fullName: payload.full_name,
    referralLink,
  });

  await supabase
    .from("waitlist_signups")
    .update({
      email_status: emailResult.status,
      email_sent_at: emailResult.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("email", payload.email);

  return { ok: true, ref_code: refCode };
}
