import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    connection: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { triggerAutoGuard, resumeAutomation, isAutomationAllowed } from "./autoguard";

describe("AutoGuard kill-switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("triggerAutoGuard", () => {
    it("returns not triggered when connection not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await triggerAutoGuard("conn-1", "user-1");

      expect(result.triggered).toBe(false);
      expect(result.message).toBe("Connection not found");
    });

    it("returns not triggered when connection belongs to different user", async () => {
      mockFindUnique.mockResolvedValue({
        id: "conn-1",
        userId: "user-2",
        alumniId: "alumni-1",
        alumni: { name: "Jane Doe" },
      });

      const result = await triggerAutoGuard("conn-1", "user-1");

      expect(result.triggered).toBe(false);
    });

    it("triggers kill-switch: updates status, pauses automation, creates audit log", async () => {
      mockFindUnique.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        alumniId: "alumni-1",
        alumni: { name: "Jane Doe" },
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({ id: "audit-1" });

      const result = await triggerAutoGuard("conn-1", "user-1");

      expect(result.triggered).toBe(true);
      expect(result.contactName).toBe("Jane Doe");
      expect(result.message).toBe("Jane Doe responded — automation paused");
      expect(result.auditLogId).toBe("audit-1");

      // Verify status update
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "conn-1" },
        data: { status: "RESPONDED", automationPaused: true },
      });

      // Verify audit log
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          contactId: "alumni-1",
          action: "AUTOGUARD_TRIGGERED",
          detail: "Automation paused — Jane Doe responded",
        },
      });
    });
  });

  describe("resumeAutomation", () => {
    it("returns not resumed when connection not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await resumeAutomation("conn-1", "user-1");

      expect(result.resumed).toBe(false);
      expect(result.message).toBe("Connection not found");
    });

    it("returns not resumed when automation is not paused", async () => {
      mockFindUnique.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        alumniId: "alumni-1",
        automationPaused: false,
        alumni: { name: "Jane Doe" },
      });

      const result = await resumeAutomation("conn-1", "user-1");

      expect(result.resumed).toBe(false);
      expect(result.message).toBe("Automation is not paused");
    });

    it("resumes automation and creates audit log", async () => {
      mockFindUnique.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        alumniId: "alumni-1",
        automationPaused: true,
        alumni: { name: "Jane Doe" },
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({ id: "audit-2" });

      const result = await resumeAutomation("conn-1", "user-1");

      expect(result.resumed).toBe(true);
      expect(result.message).toBe("Automation resumed for Jane Doe");
      expect(result.auditLogId).toBe("audit-2");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "conn-1" },
        data: { automationPaused: false },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          contactId: "alumni-1",
          action: "AUTOMATION_RESUMED",
          detail: "User manually resumed automation for Jane Doe",
        },
      });
    });
  });

  describe("isAutomationAllowed", () => {
    it("returns true when automation is not paused", () => {
      expect(isAutomationAllowed({ status: "NEW", automationPaused: false })).toBe(true);
    });

    it("returns false when automation is paused", () => {
      expect(isAutomationAllowed({ status: "RESPONDED", automationPaused: true })).toBe(false);
    });

    it("returns true even for RESPONDED status if automation was manually resumed", () => {
      expect(isAutomationAllowed({ status: "RESPONDED", automationPaused: false })).toBe(true);
    });
  });
});
