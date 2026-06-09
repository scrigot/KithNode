async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const prisma = new PrismaClient();

  try {
    // Clean existing data
    await prisma.connection.deleteMany();
    await prisma.alumniContact.deleteMany();
    await prisma.user.deleteMany();

    // Create 5 test users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: "alex.chen@unc.edu",
          name: "Alex Chen",
          university: "UNC Chapel Hill",
          targetIndustry: "Investment Banking",
        },
      }),
      prisma.user.create({
        data: {
          email: "sarah.williams@unc.edu",
          name: "Sarah Williams",
          university: "UNC Chapel Hill",
          targetIndustry: "Private Equity",
        },
      }),
      prisma.user.create({
        data: {
          email: "marcus.johnson@duke.edu",
          name: "Marcus Johnson",
          university: "Duke University",
          targetIndustry: "Consulting",
        },
      }),
      prisma.user.create({
        data: {
          email: "emily.park@unc.edu",
          name: "Emily Park",
          university: "UNC Chapel Hill",
          targetIndustry: "Investment Banking",
        },
      }),
      prisma.user.create({
        data: {
          email: "jordan.davis@wfu.edu",
          name: "Jordan Davis",
          university: "Wake Forest University",
          targetIndustry: "Private Equity",
        },
      }),
    ]);

    // Create 20 test alumni contacts
    const alumni = await Promise.all([
      prisma.alumniContact.create({
        data: { name: "Michael Torres", organization: "Goldman Sachs", title: "Vice President", linkedInUrl: "https://linkedin.com/in/mtorres", university: "UNC Chapel Hill", graduationYear: 2018 },
      }),
      prisma.alumniContact.create({
        data: { name: "Jessica Liu", organization: "Morgan Stanley", title: "Associate", linkedInUrl: "https://linkedin.com/in/jliu", university: "UNC Chapel Hill", graduationYear: 2020 },
      }),
      prisma.alumniContact.create({
        data: { name: "David Kim", organization: "J.P. Morgan", title: "Analyst", linkedInUrl: "https://linkedin.com/in/dkim", university: "Duke University", graduationYear: 2022 },
      }),
      prisma.alumniContact.create({
        data: { name: "Rachel Green", organization: "McKinsey & Company", title: "Engagement Manager", linkedInUrl: "https://linkedin.com/in/rgreen", university: "UNC Chapel Hill", graduationYear: 2016 },
      }),
      prisma.alumniContact.create({
        data: { name: "James Wright", organization: "Bain & Company", title: "Consultant", linkedInUrl: "https://linkedin.com/in/jwright", university: "Wake Forest University", graduationYear: 2021 },
      }),
      prisma.alumniContact.create({
        data: { name: "Amanda Foster", organization: "KKR", title: "Associate", linkedInUrl: "https://linkedin.com/in/afoster", university: "UNC Chapel Hill", graduationYear: 2019 },
      }),
      prisma.alumniContact.create({
        data: { name: "Ryan Patel", organization: "Blackstone", title: "Vice President", linkedInUrl: "https://linkedin.com/in/rpatel", university: "Duke University", graduationYear: 2015 },
      }),
      prisma.alumniContact.create({
        data: { name: "Sophia Martinez", organization: "BCG", title: "Principal", linkedInUrl: "https://linkedin.com/in/smartinez", university: "UNC Chapel Hill", graduationYear: 2014 },
      }),
      prisma.alumniContact.create({
        data: { name: "Daniel Lee", organization: "Evercore", title: "Analyst", linkedInUrl: "https://linkedin.com/in/dlee", university: "UNC Chapel Hill", graduationYear: 2023 },
      }),
      prisma.alumniContact.create({
        data: { name: "Olivia Brown", organization: "Lazard", title: "Associate", linkedInUrl: "https://linkedin.com/in/obrown", university: "Wake Forest University", graduationYear: 2020 },
      }),
      prisma.alumniContact.create({
        data: { name: "Chris Anderson", organization: "Apollo Global", title: "Senior Associate", linkedInUrl: "https://linkedin.com/in/canderson", university: "Duke University", graduationYear: 2018 },
      }),
      prisma.alumniContact.create({
        data: { name: "Natalie Wang", organization: "Centerview Partners", title: "Analyst", linkedInUrl: "https://linkedin.com/in/nwang", university: "UNC Chapel Hill", graduationYear: 2022 },
      }),
      prisma.alumniContact.create({
        data: { name: "Kevin Scott", organization: "Deloitte", title: "Senior Consultant", linkedInUrl: "https://linkedin.com/in/kscott", university: "UNC Chapel Hill", graduationYear: 2017 },
      }),
      prisma.alumniContact.create({
        data: { name: "Lauren Taylor", organization: "Warburg Pincus", title: "Associate", linkedInUrl: "https://linkedin.com/in/ltaylor", university: "Duke University", graduationYear: 2019 },
      }),
      prisma.alumniContact.create({
        data: { name: "Andrew Nguyen", organization: "Houlihan Lokey", title: "Vice President", linkedInUrl: "https://linkedin.com/in/anguyen", university: "Wake Forest University", graduationYear: 2016 },
      }),
      prisma.alumniContact.create({
        data: { name: "Megan Clark", organization: "Citi", title: "Director", linkedInUrl: "https://linkedin.com/in/mclark", university: "UNC Chapel Hill", graduationYear: 2012 },
      }),
      prisma.alumniContact.create({
        data: { name: "Tyler Robinson", organization: "TPG Capital", title: "Associate", linkedInUrl: "https://linkedin.com/in/trobinson", university: "Duke University", graduationYear: 2021 },
      }),
      prisma.alumniContact.create({
        data: { name: "Hannah Miller", organization: "Oliver Wyman", title: "Consultant", linkedInUrl: "https://linkedin.com/in/hmiller", university: "UNC Chapel Hill", graduationYear: 2020 },
      }),
      prisma.alumniContact.create({
        data: { name: "Brandon Harris", organization: "Bank of America", title: "Analyst", linkedInUrl: "https://linkedin.com/in/bharris", university: "UNC Chapel Hill", graduationYear: 2023 },
      }),
      prisma.alumniContact.create({
        data: { name: "Stephanie Moore", organization: "Silver Lake", title: "Senior Associate", linkedInUrl: "https://linkedin.com/in/smoore", university: "Wake Forest University", graduationYear: 2017 },
      }),
    ]);

    console.log(`Seeded ${users.length} users and ${alumni.length} alumni contacts`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
