/**
 * AgentOffice seed — Phase 1 (Floor 4 Engineering only).
 *
 * Creates 8 rooms for the user identified by SEED_USER_EMAIL (defaults to
 * samrigot31@gmail.com — the alpha tester). Idempotent via the
 * [userId, floor, slug] unique constraint.
 *
 * Run: npm run db:seed:agent-office
 */

interface RoomSeed {
  slug: string;
  name: string;
  role: string;
  systemPrompt: string;
  adapterType: string;
  position: { x: number; y: number; w: number; h: number };
}

const FLOOR = 4;

const ROOMS: RoomSeed[] = [
  {
    slug: "vp-eng",
    name: "VP Engineering",
    role: "vp_eng",
    systemPrompt:
      "You're a VP of Engineering. Plan, prioritize, break work into shippable units. Direct, decisive, opinionated.",
    adapterType: "stub",
    position: { x: 0, y: 0, w: 2, h: 1 },
  },
  {
    slug: "sr-engineer",
    name: "Senior Engineer",
    role: "senior_engineer",
    systemPrompt:
      "You're a senior engineer. Execute well-defined tasks. Write code that ships. Match the project's conventions.",
    adapterType: "stub",
    position: { x: 2, y: 0, w: 2, h: 1 },
  },
  {
    slug: "code-review",
    name: "Code Review Desk",
    role: "code_reviewer",
    systemPrompt:
      "You're a code reviewer. Read diffs critically. Severity-rated feedback. Catch bugs, security issues, and style violations. Reference file:line.",
    adapterType: "stub", // flipped to anthropic_sdk in commit 5
    position: { x: 4, y: 0, w: 1, h: 1 },
  },
  {
    slug: "qa-lab",
    name: "QA Lab",
    role: "qa_tester",
    systemPrompt:
      "You're a QA engineer. Test live functionality, find bugs, file reproducible reports with steps + expected vs actual.",
    adapterType: "stub",
    position: { x: 5, y: 0, w: 1, h: 1 },
  },
  {
    slug: "devops",
    name: "DevOps",
    role: "devops",
    systemPrompt:
      "You're a DevOps engineer. CI/CD, deployments, infrastructure, performance, observability.",
    adapterType: "stub",
    position: { x: 0, y: 1, w: 2, h: 1 },
  },
  {
    slug: "test-eng",
    name: "Test Engineering",
    role: "test_engineer",
    systemPrompt:
      "You're a test engineer. Write integration and end-to-end tests. Harden flaky tests. TDD discipline.",
    adapterType: "stub",
    position: { x: 2, y: 1, w: 1, h: 1 },
  },
  {
    slug: "debug",
    name: "Debug Room",
    role: "debugger",
    systemPrompt:
      "You're a debugger. Root cause analysis. Stack trace forensics. Never propose fixes without identifying the cause.",
    adapterType: "stub",
    position: { x: 3, y: 1, w: 1, h: 1 },
  },
  {
    slug: "refactor",
    name: "Refactor Bench",
    role: "refactor",
    systemPrompt:
      "You're a refactorer. Simplify code without changing behavior. Extract duplication. Improve naming.",
    adapterType: "stub",
    position: { x: 4, y: 1, w: 2, h: 1 },
  },
];

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/,
  );

  let prisma;
  if (match) {
    const [, user, password, host, port, database] = match;
    const adapter = new PrismaPg({
      host,
      port: parseInt(port),
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      database,
      ssl: { rejectUnauthorized: false },
    });
    prisma = new PrismaClient({ adapter });
  } else {
    const adapter = new PrismaPg({ connectionString: url });
    prisma = new PrismaClient({ adapter });
  }

  const userEmail = process.env.SEED_USER_EMAIL || "samrigot31@gmail.com";

  // userId in auth callbacks is the email (see src/lib/auth.ts jwt callback).
  const userId = userEmail;

  try {
    for (const room of ROOMS) {
      await prisma.agentRoom.upsert({
        where: {
          userId_floor_slug: {
            userId,
            floor: FLOOR,
            slug: room.slug,
          },
        },
        update: {
          name: room.name,
          role: room.role,
          systemPrompt: room.systemPrompt,
          adapterType: room.adapterType,
          position: room.position,
        },
        create: {
          userId,
          floor: FLOOR,
          slug: room.slug,
          name: room.name,
          role: room.role,
          systemPrompt: room.systemPrompt,
          adapterType: room.adapterType,
          position: room.position,
        },
      });
    }
    console.log(
      `Seeded ${ROOMS.length} AgentOffice rooms on floor ${FLOOR} for ${userEmail}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
