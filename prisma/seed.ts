/**
 * Prisma's conventional seed entrypoint delegates to the same additive,
 * local-only fixture seeder as `npm run dev:reset`. It intentionally performs
 * no deleteMany calls and refuses any hosted database configuration.
 */
import { seedLocalFixture } from "../scripts/dev/seed-local";

seedLocalFixture().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
