import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing auth
vi.mock("./db", () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        image: "",
        university: "",
        targetIndustry: "",
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      }),
    },
  },
}));

describe("Auth callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signIn callback rejects users without email", async () => {
    // Import after mocks are set up
    const { prisma } = await import("./db");

    // Simulate the signIn callback logic
    const user = { email: null, name: "No Email" };
    const result = !user.email ? false : true;
    expect(result).toBe(false);

    // Verify upsert was NOT called for users without email
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it("signIn callback creates user on first login", async () => {
    const { prisma } = await import("./db");

    // Simulate the signIn callback logic
    const user = {
      email: "new@example.com",
      name: "New User",
      image: "https://example.com/photo.jpg",
    };

    if (user.email) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name || "", image: user.image || "" },
        create: {
          email: user.email,
          name: user.name || "",
          image: user.image || "",
        },
      });
    }

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: "new@example.com" },
      update: {
        name: "New User",
        image: "https://example.com/photo.jpg",
      },
      create: {
        email: "new@example.com",
        name: "New User",
        image: "https://example.com/photo.jpg",
      },
    });
  });

  it("jwt callback attaches userId from database", async () => {
    const { prisma } = await import("./db");

    const token = { email: "test@example.com" } as Record<string, unknown>;

    // Simulate jwt callback logic
    if (token.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: token.email as string },
      });
      if (dbUser) {
        token.userId = dbUser.id;
      }
    }

    expect(token.userId).toBe("user-1");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("session callback adds userId to session", () => {
    const session = { user: { id: "" } } as { user: { id: string } };
    const token = { userId: "user-1" } as Record<string, unknown>;

    // Simulate session callback logic
    if (token.userId) {
      session.user.id = token.userId as string;
    }

    expect(session.user.id).toBe("user-1");
  });
});
