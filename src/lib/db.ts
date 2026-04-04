import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

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

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
