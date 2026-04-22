"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { submitWaitlist } from "./actions";

const TRACKS = [
  "Investment Banking",
  "Private Equity",
  "Hedge Funds",
  "Sales & Trading",
  "Consulting",
  "Venture Capital",
  "Other",
];

const GRAD_YEARS = [2026, 2027, 2028, 2029, 2030];

export function WaitlistForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      email: String(fd.get("email") || ""),
      full_name: String(fd.get("full_name") || ""),
      university: String(fd.get("university") || ""),
      grad_year: Number(fd.get("grad_year") || 0),
      target_track: String(fd.get("target_track") || ""),
      linkedin_url: String(fd.get("linkedin_url") || ""),
      greek_affiliation: String(fd.get("greek_affiliation") || ""),
      current_prep: String(fd.get("current_prep") || ""),
      referred_by: params.get("ref") || undefined,
    };

    startTransition(async () => {
      const res = await submitWaitlist(input);
      if (res.ok) {
        router.push(`/waitlist/thanks?ref=${res.ref_code}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Email" required>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@college.edu"
          className="input"
        />
      </Field>

      <Field label="Full name" required>
        <input
          type="text"
          name="full_name"
          required
          autoComplete="name"
          placeholder="Your name"
          className="input"
        />
      </Field>

      <Field label="University" required>
        <input
          type="text"
          name="university"
          required
          placeholder="UNC Chapel Hill"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Graduation year" required>
          <select name="grad_year" required defaultValue="" className="input">
            <option value="" disabled>Select</option>
            {GRAD_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Field>

        <Field label="Target track" required>
          <select name="target_track" required defaultValue="" className="input">
            <option value="" disabled>Select</option>
            {TRACKS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="LinkedIn URL">
        <input
          type="url"
          name="linkedin_url"
          placeholder="linkedin.com/in/yourname"
          className="input"
        />
      </Field>

      <Field label="What's broken in your recruiting right now?">
        <textarea
          name="current_prep"
          rows={3}
          maxLength={500}
          placeholder="Optional. Tell Sam directly — he reads every one."
          className="input resize-none"
        />
      </Field>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#0EA5E9] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#0284C7] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Request Access"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Private alpha opening to 50 students this spring. We only use this to pick the first cohort.
      </p>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 12px 14px;
          font-size: 15px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-[#0EA5E9]">*</span>}
      </span>
      {children}
    </label>
  );
}
