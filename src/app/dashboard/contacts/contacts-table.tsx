"use client";

import { useEffect, useState } from "react";
import { OutreachSlideOver } from "./outreach-slide-over";
import { AddContactSlideOver } from "./add-contact-slide-over";
import { trackEvent } from "@/lib/posthog";

export interface Contact {
  id: string;
  alumniId: string;
  name: string;
  firmName: string;
  title: string;
  university: string;
  strengthScore: number;
  status: string;
  automationPaused: boolean;
}

type SortField = "name" | "firmName" | "title" | "university" | "strengthScore" | "status";
type SortDirection = "asc" | "desc";

interface Notification {
  id: string;
  message: string;
  type: "autoguard" | "info";
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  RESPONDED: "Responded",
  CONVERTED: "Converted",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-white/[0.06] text-text-secondary",
  CONTACTED: "bg-accent-blue/10 text-accent-blue",
  RESPONDED: "bg-accent-green/10 text-accent-green",
  CONVERTED: "bg-accent-purple/10 text-accent-purple",
};

const STATUS_OPTIONS = ["NEW", "CONTACTED", "RESPONDED", "CONVERTED"];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-white/[0.06]" />
        </td>
      ))}
    </tr>
  );
}

export function ContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("strengthScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [slideOver, setSlideOver] = useState<{ connectionId: string; contactName: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchContacts = () => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
        trackEvent("contact_viewed", { contact_count: data.length });
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const addNotification = (message: string, type: Notification["type"] = "info") => {
    const id = globalThis.crypto.randomUUID();
    setNotifications((prev) => [...prev, { id, message, type }]);
    globalThis.setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleStatusChange = async (contactId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) return;

      const data = await res.json();

      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? {
                ...c,
                status: data.connection.status,
                automationPaused: data.connection.automationPaused ?? c.automationPaused,
              }
            : c,
        ),
      );

      if (data.autoGuard?.triggered) {
        addNotification(data.autoGuard.message, "autoguard");
        trackEvent("autoguard_triggered", { contact_id: contactId });
      }
    } catch {
      // silently fail
    }
  };

  const handleResumeAutomation = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume_automation" }),
      });

      if (!res.ok) return;

      const data = await res.json();

      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, automationPaused: false } : c,
        ),
      );

      addNotification(data.message, "info");
    } catch {
      // silently fail
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "strengthScore" ? "desc" : "asc");
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.firmName.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const cmp = typeof aVal === "number" ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const columns: { field: SortField; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "firmName", label: "Firm" },
    { field: "title", label: "Title" },
    { field: "university", label: "University" },
    { field: "strengthScore", label: "Strength Score" },
    { field: "status", label: "Status" },
  ];

  return (
    <div>
      <OutreachSlideOver
        connectionId={slideOver?.connectionId ?? ""}
        contactName={slideOver?.contactName ?? ""}
        open={slideOver !== null}
        onClose={() => setSlideOver(null)}
      />
      <AddContactSlideOver
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onCreated={() => {
          setShowAddForm(false);
          fetchContacts();
          addNotification("Contact added successfully", "info");
        }}
      />

      {/* AutoGuard Notifications */}
      {notifications.map((n) => (
        <div
          key={n.id}
          data-testid="autoguard-notification"
          className={`mb-3 flex items-center justify-between rounded-md px-4 py-3 text-sm font-medium ${
            n.type === "autoguard"
              ? "bg-accent-amber/10 text-accent-amber border border-accent-amber/20"
              : "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
          }`}
        >
          <span>{n.message}</span>
          <button
            onClick={() => dismissNotification(n.id)}
            className="ml-4 text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search by name or firm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-text-muted focus:border-accent-teal/30 focus:outline-none focus:ring-1 focus:ring-accent-teal/30"
        />
        <button
          onClick={() => setShowAddForm(true)}
          className="whitespace-nowrap rounded-md bg-accent-teal px-4 py-2 text-sm font-medium text-white hover:bg-accent-teal/80"
        >
          + Add Contact
        </button>
      </div>

      {loading ? (
        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="min-w-full divide-y divide-white/[0.06]">
            <thead className="bg-white/[0.03]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.field}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] bg-bg-card">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : contacts.length === 0 ? (
        <div className="border-2 border-dashed border-white/[0.06] p-12 text-center">
          <p className="text-lg font-medium text-white">No contacts yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Your alumni contacts will appear here once connections are added.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="border border-white/[0.06] bg-bg-card p-8 text-center">
          <p className="text-sm text-text-muted">
            No contacts match &quot;{search}&quot;
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="min-w-full divide-y divide-white/[0.06]">
            <thead className="bg-white/[0.03]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted hover:text-white"
                  >
                    {col.label}
                    {sortIndicator(col.field)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] bg-bg-card">
              {sorted.map((contact) => (
                <tr key={contact.id} className="hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-white">
                    {contact.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                    {contact.firmName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                    {contact.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                    {contact.university}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className="font-semibold text-white">
                      {contact.strengthScore}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <select
                      value={contact.status}
                      onChange={(e) => handleStatusChange(contact.id, e.target.value)}
                      data-testid={`status-select-${contact.id}`}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_COLORS[contact.status] || "bg-white/[0.06] text-text-secondary"}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {contact.automationPaused ? (
                        <button
                          onClick={() => handleResumeAutomation(contact.id)}
                          data-testid={`resume-btn-${contact.id}`}
                          className="rounded-md bg-accent-amber/10 px-3 py-1 text-xs font-medium text-accent-amber hover:bg-accent-amber/20"
                        >
                          Resume Automation
                        </button>
                      ) : (
                        <button
                          onClick={() => setSlideOver({ connectionId: contact.id, contactName: contact.name })}
                          className="rounded-md bg-accent-blue/10 px-3 py-1 text-xs font-medium text-accent-blue hover:bg-accent-blue/20"
                        >
                          Draft Outreach
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
