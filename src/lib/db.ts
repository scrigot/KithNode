import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Parse the connection string to extract components
  // Supabase pooler URLs have dots in the username (e.g., postgres.projectref)
  // which the pg library may not parse correctly from a connection string
  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  );

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
    return new PrismaClient({ adapter });
  }

  // Fallback: try connection string directly
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

// Lazy: the client (and its DATABASE_URL check) is constructed on first access at
// runtime, never at module load — so build-time page-data collection doesn't throw
// when DATABASE_URL is absent (e.g. preview builds). Keep eager and the build breaks.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
