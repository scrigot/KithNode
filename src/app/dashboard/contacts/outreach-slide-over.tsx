"use client";

import { useState, useEffect } from "react";

interface OutreachSlideOverProps {
  connectionId: string;
  contactName: string;
  open: boolean;
  onClose: () => void;
}

export function OutreachSlideOver({
  connectionId,
  contactName,
  open,
  onClose,
}: OutreachSlideOverProps) {
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setDraft("");
    setSubject("");

    fetch("/api/outreach/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate draft");
        return res.json();
      })
      .then((data) => {
        setDraft(data.draft);
        setSubject(data.subject);
      })
      .catch(() => {
        setError("Could not generate draft. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [open, connectionId]);

  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        data-testid="slide-over-backdrop"
      />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Draft Outreach — {contactName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
                data-testid="loading-spinner"
              />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={12}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                data-testid="draft-textarea"
              />
              <p className="mt-1 text-xs text-gray-400">
                {draft.length} characters
              </p>
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="border-t px-4 py-3 flex gap-2">
            <a
              href={mailtoHref}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              data-testid="open-in-email"
            >
              Open in Email
            </a>
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
