/**
 * Print the most recent outbound emails from the EmailLog table.
 *
 * Usage:
 *   npm run email:log            # last 50
 *   npm run email:log -- 200     # last 200
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // Clamp to a safe range so a bad argv (negative, Infinity, huge) can't reach
  // the DB query as an unbounded `take`.
  const limit = Math.min(Math.max(Math.trunc(Number(process.argv[2])) || 50, 1), 1000);
  const { prisma } = await import("@/lib/db");

  const rows = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (rows.length === 0) {
    console.log("No emails logged yet.");
    process.exit(0);
  }

  const header = `${"WHEN".padEnd(19)}  ${"STATUS".padEnd(7)}  ${"TYPE".padEnd(13)}  ${"TO".padEnd(34)}  ERROR`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const r of rows) {
    const ts = r.createdAt.toISOString().replace("T", " ").slice(0, 19);
    console.log(
      `${ts}  ${r.status.padEnd(7)}  ${r.type.padEnd(13)}  ${r.toEmail.padEnd(34)}  ${r.error || ""}`,
    );
  }

  console.log(`\n${rows.length} row(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[email:log] fatal", err);
  process.exit(1);
});
