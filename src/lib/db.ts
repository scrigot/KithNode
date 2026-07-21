import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseUrl } from "@/lib/env/server";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = databaseUrl();

  // Parse the connection string to extract components
  // Supabase pooler URLs have dots in the username (e.g., postgres.projectref)
  // which the pg library may not parse correctly from a connection string
  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  );

  if (match) {
    const [, user, password, host, port, database] = match;
    // Local Postgres (e.g. the supabase local stack for the /me workspace) does
    // NOT speak SSL — forcing it throws "server does not support SSL connections".
    // Prod/Supabase hosts are never localhost, so they keep SSL.
    const isLocal = /^(127\.0\.0\.1|localhost|::1|0\.0\.0\.0)$/.test(host);
    const adapter = new PrismaPg({
      host,
      port: parseInt(port),
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      database,
      ssl: isLocal ? false : { rejectUnauthorized: false },
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
