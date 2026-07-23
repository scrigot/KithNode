#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

export const LOCAL_FIXTURE_USER_ID = "fixture-student-user";
export const LOCAL_FIXTURE_USER_EMAIL = "student@kithnode.local";

function requireLocalEnvironment() {
  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const databaseUrl = process.env.DATABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const localApi = /^http:\/\/(?:127\.0\.0\.1|localhost):54321\/?$/.test(apiUrl);
  const localDatabase = /@(?:127\.0\.0\.1|localhost):54322\//.test(databaseUrl);

  if (!localApi || !localDatabase || !serviceRoleKey) {
    throw new Error(
      "Local fixture seeding is blocked unless both Supabase and Postgres point to the local development stack.",
    );
  }
  return { apiUrl, serviceRoleKey };
}

function profileContent() {
  return {
    basics: {
      firstName: "Jordan",
      lastName: "Student",
      headline: "Applied AI builder · RAG, agents, and enterprise automation",
      about: "I build reliable AI systems that turn fragmented knowledge into useful agents and automated workflows.",
      location: "Raleigh, NC",
      industry: "Artificial Intelligence",
      profileUrl: "https://www.linkedin.com/in/kithnode-fixture-student",
    },
    positioning: {
      targetRoles: ["Applied AI Intern", "AI Solutions Engineering Intern", "Product Management Intern"],
      targetIndustries: ["Artificial Intelligence", "Enterprise Software", "Consulting"],
      targetLocations: ["Raleigh", "New York", "San Francisco", "Remote"],
      keywords: ["retrieval-augmented generation", "agentic AI", "Python", "SQL", "Microsoft Fabric"],
      valueProposition: "I turn enterprise data and knowledge into reliable AI agents and second-brain workflows.",
    },
    sections: {
      experience: [{
        id: "fixture-experience-1",
        title: "Applied AI Intern",
        organization: "Comfort Systems USA",
        description: "Built retrieval and agent workflows over enterprise operating data.",
        startDate: "2026-05",
        endDate: "Present",
        skills: ["Python", "Retrieval-Augmented Generation", "AI Agents"],
      }],
      education: [{
        id: "fixture-education-1",
        title: "BS, Data Science",
        organization: "UNC–Chapel Hill",
        description: "Coursework in machine learning, databases, statistics, and business.",
        startDate: "2024",
        endDate: "2028",
      }],
      projects: [{
        id: "fixture-project-1",
        title: "Enterprise second brain",
        description: "Built a cited RAG assistant with evaluation and approval-gated actions.",
        skills: ["RAG", "Postgres", "TypeScript"],
      }],
      skills: [
        { id: "fixture-skill-1", title: "Retrieval-Augmented Generation" },
        { id: "fixture-skill-2", title: "Agentic AI" },
        { id: "fixture-skill-3", title: "Python" },
        { id: "fixture-skill-4", title: "SQL" },
        { id: "fixture-skill-5", title: "Microsoft Fabric" },
      ],
    },
  };
}

function resumeContent() {
  return {
    header: {
      name: "Jordan Student",
      title: "Applied AI and Solutions Engineering Intern",
      location: "Raleigh, NC",
    },
    sections: [
      {
        id: "experience",
        title: "Experience",
        items: [{
          id: "comfort",
          heading: "Applied AI Intern",
          subheading: "Comfort Systems USA",
          bullets: [
            "Built retrieval-augmented workflows over enterprise operating data.",
            "Developed approval-gated AI agents using Python, SQL, and TypeScript.",
          ],
        }],
      },
      {
        id: "projects",
        title: "Projects",
        items: [{
          id: "second-brain",
          heading: "Enterprise second brain",
          bullets: ["Built a cited RAG assistant with evaluation, provenance, and reversible actions."],
        }],
      },
    ],
  };
}

export async function seedLocalFixture() {
  const { apiUrl, serviceRoleKey } = requireLocalEnvironment();
  const client = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();

  const writes = [
    client.from("User").upsert({
      id: LOCAL_FIXTURE_USER_ID,
      email: LOCAL_FIXTURE_USER_EMAIL,
      name: "Jordan Student",
      university: "UNC Chapel Hill",
      major: "Data Science",
      graduationYear: 2028,
      skills: "Retrieval-Augmented Generation, Agentic AI, Python, SQL, Microsoft Fabric",
      experiences: "Applied AI Intern at Comfort Systems USA; enterprise second-brain and agent workflows",
      educations: "BS Data Science, UNC Chapel Hill, expected 2028",
      targetIndustry: "Applied AI",
      targetIndustries: "Artificial Intelligence, Enterprise Software, Consulting",
      targetFirms: "Scale AI, Databricks, Anthropic, OpenAI",
      targetLocations: "Raleigh, New York, San Francisco, Remote",
      recruitingDate: "2027-04-15T00:00:00.000Z",
      tutorialDoneAt: now,
    }, { onConflict: "id" }),
    client.from("LinkedInProfile").upsert({
      id: "fixture-linkedin-profile",
      userId: LOCAL_FIXTURE_USER_ID,
      name: "Jordan Student — primary profile",
      linkedInUrl: "https://www.linkedin.com/in/kithnode-fixture-student",
      source: "manual",
      status: "current",
      isPrimary: true,
      content: profileContent(),
      audit: {},
      score: 82,
    }, { onConflict: "id" }),
    client.from("MeResume").upsert({
      id: "fixture-resume",
      userId: LOCAL_FIXTURE_USER_EMAIL,
      title: "Applied AI internship resume",
      track: "ai-engineering",
      templateId: "dense",
      content: resumeContent(),
      score: 84,
      dimensions: [],
      notes: [],
      docVersion: 2,
      userContext: "Undergraduate seeking Summer 2027 applied AI and solutions engineering internships.",
    }, { onConflict: "id" }),
    client.from("AlumniContact").upsert({
      id: "fixture-contact-scale-verified",
      name: "Maya Chen",
      firmName: "Scale AI",
      title: "Forward Deployed Engineer",
      linkedInUrl: "https://www.linkedin.com/in/kithnode-fixture-scale",
      university: "UNC Chapel Hill",
      graduationYear: 2022,
      education: "UNC Chapel Hill",
      location: "New York, NY",
      skills: "Applied AI, Python, Enterprise Software",
      source: "manual",
      importedByUserId: LOCAL_FIXTURE_USER_ID,
    }, { onConflict: "id" }),
    client.from("AlumniContact").upsert({
      id: "fixture-contact-databricks-potential",
      name: "Avery Patel",
      firmName: "Databricks",
      title: "Product Manager",
      linkedInUrl: "https://www.linkedin.com/in/kithnode-fixture-databricks",
      university: "UNC Chapel Hill",
      graduationYear: 2021,
      education: "UNC Chapel Hill",
      location: "San Francisco, CA",
      skills: "Data Platforms, Product Management",
      source: "linkedin_import",
      importedByUserId: LOCAL_FIXTURE_USER_ID,
    }, { onConflict: "id" }),
  ];
  const results = await Promise.all(writes);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw new Error(`Fixture seed failed: ${firstError.message}`);

  const relationshipWrites = await Promise.all([
    client.from("Connection").upsert({
      id: "fixture-connection-scale",
      userId: LOCAL_FIXTURE_USER_ID,
      alumniId: "fixture-contact-scale-verified",
      strengthScore: 1,
      status: "connected",
    }, { onConflict: "userId,alumniId" }),
    client.from("RelationshipEvidence").upsert({
      id: "fixture-relationship-scale",
      userId: LOCAL_FIXTURE_USER_ID,
      contactId: "fixture-contact-scale-verified",
      state: "verified",
      relationshipType: "former classmate",
      source: "user_confirmed",
      sourceId: "fixture-confirmation",
      summary: "User confirmed they worked with Maya in a UNC applied-AI course.",
      confidence: 1,
      verifiedByUser: true,
      effectiveAt: now,
    }, { onConflict: "userId,contactId,source,sourceId,relationshipType" }),
    client.from("RelationshipEvidence").upsert({
      id: "fixture-relationship-databricks",
      userId: LOCAL_FIXTURE_USER_ID,
      contactId: "fixture-contact-databricks-potential",
      state: "potential",
      relationshipType: "shared school",
      source: "linkedin_import",
      sourceId: "fixture-import",
      summary: "Both profiles list UNC; no interaction has been confirmed.",
      confidence: 0.55,
      verifiedByUser: false,
      effectiveAt: now,
    }, { onConflict: "userId,contactId,source,sourceId,relationshipType" }),
  ]);
  const relationshipError = relationshipWrites.find((result) => result.error)?.error;
  if (relationshipError) throw new Error(`Relationship fixture seed failed: ${relationshipError.message}`);

  console.log(`Seeded local recruiting fixture for ${LOCAL_FIXTURE_USER_EMAIL}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedLocalFixture().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
