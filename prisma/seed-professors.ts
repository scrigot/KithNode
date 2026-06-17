import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

// Static UNC Kenan-Flagler faculty preseed.
//
// This produces deterministic professor data so the demo does not depend on
// the live UNC scrape pipeline at /api/professors/seed. Run with:
//   npm run db:seed:professors
//
// Each record is upserted on linkedInUrl (unique key in AlumniContact).
// Source is set to "professor" so existing Discover / outreach paths that
// branch on alumniSource === "professor" pick these up correctly.

type ProfessorSeed = {
  name: string;
  department: string;
  title: string;
  linkedInUrl: string;
  email: string;
  researchAreas: string[];
  profType: "research" | "teaching";
};

const PROFESSORS: ProfessorSeed[] = [
  {
    name: "Eric Ghysels",
    department: "Kenan-Flagler / Economics",
    title: "Edward M. Bernstein Distinguished Professor of Economics",
    linkedInUrl: "https://linkedin.com/in/preseed/eric-ghysels",
    email: "eghysels@unc.edu",
    researchAreas: ["financial econometrics", "machine learning in finance"],
    profType: "research",
  },
  {
    name: "Christian Lundblad",
    department: "Kenan-Flagler",
    title: "Richard Levin Distinguished Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/christian-lundblad",
    email: "lundblac@kenan-flagler.unc.edu",
    researchAreas: ["asset pricing", "emerging markets"],
    profType: "research",
  },
  {
    name: "Jennifer Conrad",
    department: "Kenan-Flagler",
    title: "Dalton McMichael Distinguished Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/jennifer-conrad",
    email: "conradj@kenan-flagler.unc.edu",
    researchAreas: ["market microstructure", "investments"],
    profType: "research",
  },
  {
    name: "Gregory Brown",
    department: "Kenan-Flagler",
    title: "Sarah Graham Kenan Distinguished Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/gregory-brown",
    email: "gregwbrown@unc.edu",
    researchAreas: ["private equity", "risk management"],
    profType: "research",
  },
  {
    name: "Camelia Kuhnen",
    department: "Kenan-Flagler",
    title: "Sarah Graham Kenan Distinguished Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/camelia-kuhnen",
    email: "kuhnen@unc.edu",
    researchAreas: ["neurofinance", "behavioral finance"],
    profType: "research",
  },
  {
    name: "Paige Ouimet",
    department: "Kenan-Flagler",
    title: "Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/paige-ouimet",
    email: "paige_ouimet@unc.edu",
    researchAreas: ["labor and finance", "corporate finance"],
    profType: "research",
  },
  {
    name: "Adam Reed",
    department: "Kenan-Flagler",
    title: "Julian Price Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/adam-reed",
    email: "adam_reed@unc.edu",
    researchAreas: ["short selling", "securities lending"],
    profType: "research",
  },
  {
    name: "Anh Le",
    department: "Kenan-Flagler",
    title: "Associate Professor of Finance",
    linkedInUrl: "https://linkedin.com/in/preseed/anh-le",
    email: "anh_le@unc.edu",
    researchAreas: ["term structure", "macro-finance"],
    profType: "research",
  },
  {
    name: "Doug Shackelford",
    department: "Kenan-Flagler",
    title: "Meade H. Willis Distinguished Professor of Taxation",
    linkedInUrl: "https://linkedin.com/in/preseed/doug-shackelford",
    email: "doug_shack@unc.edu",
    researchAreas: ["taxation", "accounting policy"],
    profType: "research",
  },
  {
    name: "Mark Lang",
    department: "Kenan-Flagler",
    title: "Thomas W. Hudson Jr. and Robert M. Hayes Distinguished Professor of Accounting",
    linkedInUrl: "https://linkedin.com/in/preseed/mark-lang",
    email: "mark_lang@unc.edu",
    researchAreas: ["disclosure", "international accounting"],
    profType: "research",
  },
  {
    name: "Brad Hendricks",
    department: "Kenan-Flagler",
    title: "Associate Professor of Accounting",
    linkedInUrl: "https://linkedin.com/in/preseed/brad-hendricks",
    email: "brad_hendricks@unc.edu",
    researchAreas: ["financial reporting", "shareholder activism"],
    profType: "research",
  },
  {
    name: "Atul Nerkar",
    department: "Kenan-Flagler",
    title: "John C. Cooper Distinguished Professor of Strategy and Entrepreneurship",
    linkedInUrl: "https://linkedin.com/in/preseed/atul-nerkar",
    email: "atul_nerkar@unc.edu",
    researchAreas: ["innovation strategy", "technology management"],
    profType: "research",
  },
  {
    name: "Olga Hawn",
    department: "Kenan-Flagler",
    title: "Associate Professor of Strategy and Entrepreneurship",
    linkedInUrl: "https://linkedin.com/in/preseed/olga-hawn",
    email: "olga_hawn@unc.edu",
    researchAreas: ["corporate reputation", "ESG"],
    profType: "research",
  },
  {
    name: "Bradley Staats",
    department: "Kenan-Flagler",
    title: "Sarah Graham Kenan Distinguished Professor of Operations",
    linkedInUrl: "https://linkedin.com/in/preseed/bradley-staats",
    email: "bstaats@unc.edu",
    researchAreas: ["operations", "learning organizations"],
    profType: "research",
  },
  {
    name: "Jay Swaminathan",
    department: "Kenan-Flagler",
    title: "GlaxoSmithKline Distinguished Professor of Operations",
    linkedInUrl: "https://linkedin.com/in/preseed/jay-swaminathan",
    email: "msj@unc.edu",
    researchAreas: ["supply chain", "global operations"],
    profType: "research",
  },
];

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  );

  const adapter = match
    ? new PrismaPg({
        host: match[3],
        port: parseInt(match[4]),
        user: decodeURIComponent(match[1]),
        password: decodeURIComponent(match[2]),
        database: match[5],
        ssl: { rejectUnauthorized: false },
      })
    : new PrismaPg({ connectionString: url });

  const prisma = new PrismaClient({ adapter });

  let inserted = 0;
  let updated = 0;

  try {
    for (const prof of PROFESSORS) {
      const affiliations = [
        `proftype:${prof.profType}`,
        ...prof.researchAreas,
      ].join(",");

      const existing = await prisma.alumniContact.findUnique({
        where: { linkedInUrl: prof.linkedInUrl },
      });

      const data = {
        name: prof.name,
        firmName: prof.department,
        title: prof.title,
        linkedInUrl: prof.linkedInUrl,
        university: "UNC",
        graduationYear: 0,
        email: prof.email,
        location: "Chapel Hill, NC",
        affiliations,
        source: "professor",
        industry: "Academia",
        seniorityLevel: "Professor",
      };

      if (existing) {
        await prisma.alumniContact.update({
          where: { linkedInUrl: prof.linkedInUrl },
          data,
        });
        updated += 1;
      } else {
        await prisma.alumniContact.create({ data });
        inserted += 1;
      }
    }

    console.log(
      `Seeded ${PROFESSORS.length} professors: ${inserted} inserted, ${updated} updated`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
