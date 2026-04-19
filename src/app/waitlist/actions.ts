"use server";

import { supabase } from "@/lib/supabase";
import { sendWaitlistConfirmation } from "@/lib/resend";
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

  const h = await headers();
  const host = h.get("host") || "kithnode.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const referralLink = `${proto}://${host}/?ref=${refCode}`;

  void sendWaitlistConfirmation({
    email: payload.email,
    fullName: payload.full_name,
    referralLink,
  });

  return { ok: true, ref_code: refCode };
}
