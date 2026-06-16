import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the prisma singleton so the helper never touches a real DB.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { emailLog: { create: createMock } } }));

import { logEmail } from "@/lib/email/log";

describe("logEmail", () => {
  beforeEach(() => createMock.mockReset());

  it("maps a sent result to a row (providerId from id, empty error)", async () => {
    await logEmail({
      toEmail: "connor@example.com",
      type: "setup",
      result: { status: "sent", id: "re_abc123" },
      userId: "connor@example.com",
      subject: "Welcome",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toEmail: "connor@example.com",
        type: "setup",
        status: "sent",
        providerId: "re_abc123",
        error: "",
        userId: "connor@example.com",
        subject: "Welcome",
      }),
    });
  });

  it("maps a failed result to a row (error preserved, empty providerId)", async () => {
    await logEmail({
      toEmail: "connor@example.com",
      type: "weekly_digest",
      result: { status: "failed", error: "rate limited" },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "failed",
        error: "rate limited",
        providerId: "",
      }),
    });
  });

  it("never throws when the DB write fails", async () => {
    createMock.mockRejectedValueOnce(new Error("db down"));
    await expect(
      logEmail({ toEmail: "x@y.com", type: "setup", result: { status: "sent" } }),
    ).resolves.toBeUndefined();
  });
});
