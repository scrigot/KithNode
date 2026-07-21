import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsDir = join(root, "supabase/migrations");
const manifest = JSON.parse(
  readFileSync(join(root, "scripts/db/production-migrations.json"), "utf8"),
);
const checkOnly = process.argv.includes("--check");
const missing = [];
const expectedVersions = new Set(manifest.map(([version]) => version));
const productionCutoff = manifest.at(-1)[0];

for (const [version, name] of manifest) {
  const path = join(migrationsDir, `${version}_${name}.sql`);
  if (existsSync(path)) continue;
  missing.push(`${version}_${name}.sql`);
  if (!checkOnly) {
    writeFileSync(
      path,
      `-- Historical migration recorded in production.\n-- Its resulting schema is captured in supabase/baseline/20260711004756_public.sql.\n`,
    );
  }
}

const localFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));
const versions = localFiles.map((file) => file.split("_", 1)[0]);
const duplicateVersions = [...new Set(versions.filter((version, index) => versions.indexOf(version) !== index))];
const unexpectedHistorical = localFiles.filter((file) => {
  const version = file.split("_", 1)[0];
  return version <= productionCutoff && !expectedVersions.has(version);
});

if (checkOnly && (missing.length || duplicateVersions.length || unexpectedHistorical.length)) {
  if (missing.length) console.error(`Missing production migration markers:\n${missing.join("\n")}`);
  if (duplicateVersions.length) console.error(`Duplicate migration versions:\n${duplicateVersions.join("\n")}`);
  if (unexpectedHistorical.length) console.error(`Unexpected pre-cutoff migrations:\n${unexpectedHistorical.join("\n")}`);
  process.exit(1);
}

console.log(
  missing.length
    ? `${checkOnly ? "Missing" : "Created"} ${missing.length} migration marker(s).`
    : "Production migration history is materialized.",
);
