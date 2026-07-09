import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ImportCard from "./import-card";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("ImportCard", () => {
  it("shows a blocking import overlay with the parsed connection count", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<ImportCard />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const csv = "First Name,Last Name\nAda,Lovelace\nGrace,Hopper\n";
    const file = new File([csv], "Connections.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("Importing ~2 connections…")).toBeInTheDocument();
  });

  it("refreshes the contacts list after a successful import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          total: 1,
          created: 1,
          updated: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        }),
      }))
    );
    render(<ImportCard />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["First Name,Last Name\nAda,Lovelace\n"], "Connections.csv", {
      type: "text/csv",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("added")).toBeInTheDocument();
  });
});
