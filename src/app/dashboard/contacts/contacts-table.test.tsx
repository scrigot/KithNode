import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { ContactsTable, type Contact } from "./contacts-table";

const mockContacts: Contact[] = [
  {
    id: "conn-1",
    alumniId: "alumni-1",
    name: "Jane Doe",
    firmName: "Goldman Sachs",
    title: "VP",
    university: "Harvard",
    strengthScore: 85,
    status: "NEW",
  },
  {
    id: "conn-2",
    alumniId: "alumni-2",
    name: "John Smith",
    firmName: "McKinsey",
    title: "Associate",
    university: "Stanford",
    strengthScore: 60,
    status: "CONTACTED",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ContactsTable", () => {
  it("shows loading skeleton initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<ContactsTable />);
    const skeletonRows = document.querySelectorAll(".animate-pulse");
    expect(skeletonRows.length).toBeGreaterThan(0);
  });

  it("renders contacts after loading", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockContacts),
    });

    render(<ContactsTable />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    expect(screen.getByText("Goldman Sachs")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("McKinsey")).toBeInTheDocument();
  });

  it("shows empty state when no contacts", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    });

    render(<ContactsTable />);

    await waitFor(() => {
      expect(screen.getByText("No contacts yet")).toBeInTheDocument();
    });
  });

  it("filters contacts by name search", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockContacts),
    });

    render(<ContactsTable />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or firm...");
    fireEvent.change(searchInput, { target: { value: "jane" } });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
  });

  it("filters contacts by firm search", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockContacts),
    });

    render(<ContactsTable />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or firm...");
    fireEvent.change(searchInput, { target: { value: "mckinsey" } });

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("sorts by column when header clicked", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockContacts),
    });

    render(<ContactsTable />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    // Default sort is strength score desc, so Jane (85) should be first
    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveTextContent("Jane Doe");
    expect(rows[1]).toHaveTextContent("John Smith");

    // Click Name column to sort alphabetically
    fireEvent.click(screen.getByText(/^Name/));

    const sortedRows = document.querySelectorAll("tbody tr");
    expect(sortedRows[0]).toHaveTextContent("Jane Doe");
    expect(sortedRows[1]).toHaveTextContent("John Smith");
  });

  it("displays status badges with correct labels", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockContacts),
    });

    render(<ContactsTable />);

    await waitFor(() => {
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("Contacted")).toBeInTheDocument();
    });
  });
});
