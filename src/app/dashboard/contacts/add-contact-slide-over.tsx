"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/posthog";

interface AddContactSlideOverProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddContactSlideOver({
  open,
  onClose,
  onCreated,
}: AddContactSlideOverProps) {
  const [name, setName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [title, setTitle] = useState("");
  const [university, setUniversity] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setFirmName("");
    setTitle("");
    setUniversity("");
    setGraduationYear("");
    setLinkedInUrl("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          firmName,
          title,
          university,
          graduationYear: Number(graduationYear),
          linkedInUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add contact");
      }

      trackEvent("contact_added", { name, firmName });
      resetForm();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={handleClose}
        data-testid="add-contact-backdrop"
      />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Contact
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            className={`${inputClass} mb-4`}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Firm *
          </label>
          <input
            type="text"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            placeholder="Goldman Sachs"
            required
            className={`${inputClass} mb-4`}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vice President"
            required
            className={`${inputClass} mb-4`}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            University *
          </label>
          <input
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="Wharton"
            required
            className={`${inputClass} mb-4`}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Graduation Year *
          </label>
          <input
            type="number"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            placeholder="2020"
            min={1950}
            max={2030}
            required
            className={`${inputClass} mb-4`}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn URL
          </label>
          <input
            type="url"
            value={linkedInUrl}
            onChange={(e) => setLinkedInUrl(e.target.value)}
            placeholder="https://linkedin.com/in/janesmith"
            className={`${inputClass} mb-4`}
          />

          <div className="border-t -mx-4 px-4 py-3 mt-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Contact"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
