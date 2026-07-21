


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AlumniContact" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "firmName" "text" NOT NULL,
    "title" "text" NOT NULL,
    "linkedInUrl" "text" DEFAULT ''::"text" NOT NULL,
    "university" "text" NOT NULL,
    "graduationYear" integer NOT NULL,
    "education" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "highSchool" "text" DEFAULT ''::"text" NOT NULL,
    "clubs" "text" DEFAULT ''::"text" NOT NULL,
    "passions" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "affiliations" "text" DEFAULT ''::"text" NOT NULL,
    "warmthScore" double precision DEFAULT 0 NOT NULL,
    "tier" "text" DEFAULT 'cold'::"text" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "importedByUserId" "text" DEFAULT ''::"text" NOT NULL,
    "industry" "text" DEFAULT ''::"text" NOT NULL,
    "seniorityLevel" "text" DEFAULT ''::"text" NOT NULL,
    "greekOrg" "text" DEFAULT ''::"text" NOT NULL,
    "personType" "text" DEFAULT ''::"text" NOT NULL,
    "major" "text" DEFAULT ''::"text" NOT NULL,
    "minor" "text" DEFAULT ''::"text" NOT NULL,
    "concentration" "text" DEFAULT ''::"text" NOT NULL,
    "degrees" "text" DEFAULT ''::"text" NOT NULL,
    "skills" "text" DEFAULT ''::"text" NOT NULL,
    "pastFirms" "text" DEFAULT ''::"text" NOT NULL,
    "hometown" "text" DEFAULT ''::"text" NOT NULL,
    "track" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT ''::"text" NOT NULL,
    "educations" "text" DEFAULT ''::"text" NOT NULL,
    "experiences" "text" DEFAULT ''::"text" NOT NULL,
    "isFriend" boolean DEFAULT false NOT NULL,
    "speakFrequency" "text" DEFAULT ''::"text" NOT NULL,
    "lastSpokenAt" timestamp(6) with time zone,
    "clubMemberships" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "enrichedAt" timestamp(3) without time zone,
    "enrichmentSource" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."AlumniContact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssistantApproval" (
    "id" "text" NOT NULL,
    "toolCallId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decidedAt" timestamp with time zone
);


ALTER TABLE "public"."AssistantApproval" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssistantConversation" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."AssistantConversation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssistantMemory" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "sourceMessageId" "text",
    "confidence" double precision DEFAULT 1 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."AssistantMemory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssistantMessage" (
    "id" "text" NOT NULL,
    "conversationId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."AssistantMessage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssistantRun" (
    "id" "text" NOT NULL,
    "conversationId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "model" "text" NOT NULL,
    "inputTokens" integer DEFAULT 0 NOT NULL,
    "outputTokens" integer DEFAULT 0 NOT NULL,
    "error" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completedAt" timestamp with time zone
);


ALTER TABLE "public"."AssistantRun" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssistantToolCall" (
    "id" "text" NOT NULL,
    "runId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "toolName" "text" NOT NULL,
    "input" "jsonb" NOT NULL,
    "output" "jsonb",
    "status" "text" DEFAULT 'proposed'::"text" NOT NULL,
    "riskLevel" "text" DEFAULT 'read'::"text" NOT NULL,
    "requiresApproval" boolean DEFAULT true NOT NULL,
    "error" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completedAt" timestamp with time zone
);


ALTER TABLE "public"."AssistantToolCall" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuditLog" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "action" "text" NOT NULL,
    "detail" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."AuditLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CareerGoal" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."CareerGoal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Connection" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "alumniId" "text" NOT NULL,
    "strengthScore" double precision DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'NEW'::"text" NOT NULL,
    "automationPaused" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Connection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ContactConnection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ownerUserId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "mutualName" "text" NOT NULL,
    "mutualSlug" "text" DEFAULT ''::"text" NOT NULL,
    "mutualKey" "text" NOT NULL,
    "mutualContactId" "text",
    "source" "text" DEFAULT 'linkedin_extension'::"text" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ContactConnection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."EmailEvent" (
    "id" "text" NOT NULL,
    "emailId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "subject" "text",
    "payload" "jsonb" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."EmailEvent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."EmailLog" (
    "id" "text" NOT NULL,
    "userId" "text" DEFAULT ''::"text" NOT NULL,
    "toEmail" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" NOT NULL,
    "providerId" "text" DEFAULT ''::"text" NOT NULL,
    "error" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."EmailLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Feedback" (
    "id" "uuid" NOT NULL,
    "userEmail" "text" NOT NULL,
    "page" "text" DEFAULT ''::"text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeContact" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "firmName" "text",
    "title" "text",
    "linkedInUrl" "text",
    "email" "text",
    "location" "text",
    "education" "text",
    "industry" "text",
    "seniorityLevel" "text",
    "pastFirms" "text",
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "alumniContactId" "text",
    "connectedOn" timestamp(3) without time zone,
    "lastSpokenAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MeContact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeContactActivity" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "type" "text" DEFAULT 'note'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "detail" "text" DEFAULT ''::"text" NOT NULL,
    "occurredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."MeContactActivity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeContactMemory" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "relationshipType" "text" DEFAULT ''::"text" NOT NULL,
    "strategicValue" "text" DEFAULT ''::"text" NOT NULL,
    "actionItems" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MeContactMemory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeContactNote" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "author" "text" DEFAULT 'user'::"text" NOT NULL,
    "kind" "text" DEFAULT 'chat'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "extracted" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MeContactNote" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeDiscoveryLead" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "status" "text" DEFAULT 'researching'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "firmName" "text",
    "title" "text",
    "linkedInUrl" "text",
    "email" "text",
    "location" "text",
    "education" "text",
    "industry" "text",
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "sourceQuery" "text" DEFAULT ''::"text" NOT NULL,
    "sourceUrl" "text" DEFAULT ''::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "reasons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "savedContactId" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MeDiscoveryLead" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeEvidence" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "kind" "text" DEFAULT 'project'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "detail" "text" DEFAULT ''::"text" NOT NULL,
    "metric" "text" DEFAULT ''::"text" NOT NULL,
    "proofUrl" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MeEvidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MePipeline" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" DEFAULT 'ORG'::"text" NOT NULL,
    "stages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "cadenceDays" integer,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MePipeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MePipelineEntry" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "pipelineId" "text" NOT NULL,
    "stage" "text" DEFAULT 'identified'::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "lastTouchAt" timestamp(3) without time zone,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MePipelineEntry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MePrepBrief" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "brief" "jsonb" NOT NULL,
    "model" "text" DEFAULT ''::"text" NOT NULL,
    "promptVersion" "text" DEFAULT 'v1'::"text" NOT NULL,
    "memoryHash" "text" DEFAULT ''::"text" NOT NULL,
    "contextHash" "text" DEFAULT ''::"text" NOT NULL,
    "meta" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MePrepBrief" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeProfile" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "schools" "text" DEFAULT ''::"text" NOT NULL,
    "clubs" "text" DEFAULT ''::"text" NOT NULL,
    "pastFirms" "text" DEFAULT ''::"text" NOT NULL,
    "hometown" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "currentWork" "text" DEFAULT ''::"text" NOT NULL,
    "goals" "text" DEFAULT ''::"text" NOT NULL,
    "targetRoles" "text" DEFAULT ''::"text" NOT NULL,
    "targetExpertise" "text" DEFAULT ''::"text" NOT NULL,
    "targetCompanies" "text" DEFAULT ''::"text" NOT NULL,
    "targetLocations" "text" DEFAULT ''::"text" NOT NULL,
    "searchKeywords" "text" DEFAULT ''::"text" NOT NULL,
    "profileNotes" "text" DEFAULT ''::"text" NOT NULL,
    "outreachStyle" "text" DEFAULT ''::"text" NOT NULL,
    "outreachLength" "text" DEFAULT ''::"text" NOT NULL,
    "outreachSignoff" "text" DEFAULT ''::"text" NOT NULL,
    "outreachPositioning" "text" DEFAULT ''::"text" NOT NULL,
    "outreachGoals" "text" DEFAULT ''::"text" NOT NULL,
    "preferredEmailClient" "text" DEFAULT ''::"text" NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MeProfile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MeResume" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "title" "text" DEFAULT 'Untitled resume'::"text" NOT NULL,
    "track" "text" DEFAULT 'ai-consulting'::"text" NOT NULL,
    "templateId" "text" DEFAULT 'dense'::"text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "dimensions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "docVersion" integer DEFAULT 1 NOT NULL,
    "userContext" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."MeResume" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Pipeline" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "stages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "cadenceDays" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Pipeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."PipelineEntry" (
    "id" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "pipelineId" "text",
    "stage" "text" DEFAULT 'RESEARCHED'::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastTouchAt" timestamp(3) without time zone,
    "userId" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."PipelineEntry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."PromoCode" (
    "id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "days" integer DEFAULT 7 NOT NULL,
    "credits" integer DEFAULT 50 NOT NULL,
    "plan" "text" DEFAULT 'trial'::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "redeemedByEmail" "text",
    "redeemedAt" timestamp(3) without time zone
);


ALTER TABLE "public"."PromoCode" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Recommendation" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "goalId" "text",
    "kind" "text" NOT NULL,
    "title" "text" NOT NULL,
    "rationale" "text" NOT NULL,
    "evidence" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "confidence" double precision DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "dueAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actedAt" timestamp with time zone
);


ALTER TABLE "public"."Recommendation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."UsageEvent" (
    "id" "uuid" NOT NULL,
    "userEmail" "text" NOT NULL,
    "action" "text" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "costUsd" numeric(65,30) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."UsageEvent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "image" "text" DEFAULT ''::"text" NOT NULL,
    "university" "text" DEFAULT ''::"text" NOT NULL,
    "highSchool" "text" DEFAULT ''::"text" NOT NULL,
    "targetIndustry" "text" DEFAULT ''::"text" NOT NULL,
    "hometown" "text" DEFAULT ''::"text" NOT NULL,
    "greekOrg" "text" DEFAULT ''::"text" NOT NULL,
    "targetIndustries" "text" DEFAULT ''::"text" NOT NULL,
    "targetFirms" "text" DEFAULT ''::"text" NOT NULL,
    "targetLocations" "text" DEFAULT ''::"text" NOT NULL,
    "clubs" "text" DEFAULT ''::"text" NOT NULL,
    "skills" "text" DEFAULT ''::"text" NOT NULL,
    "major" "text" DEFAULT ''::"text" NOT NULL,
    "minor" "text" DEFAULT ''::"text" NOT NULL,
    "concentration" "text" DEFAULT ''::"text" NOT NULL,
    "degrees" "text" DEFAULT ''::"text" NOT NULL,
    "pastFirms" "text" DEFAULT ''::"text" NOT NULL,
    "educations" "text" DEFAULT ''::"text" NOT NULL,
    "experiences" "text" DEFAULT ''::"text" NOT NULL,
    "clubMemberships" "text" DEFAULT ''::"text" NOT NULL,
    "recruitingDate" timestamp(3) without time zone,
    "graduationYear" integer,
    "weeklyGoalTarget" integer DEFAULT 3 NOT NULL,
    "stripeCustomerId" "text" DEFAULT ''::"text",
    "subscriptionStatus" "text" DEFAULT 'trial'::"text",
    "subscriptionPlan" "text" DEFAULT ''::"text",
    "trialEndsAt" timestamp(3) without time zone DEFAULT ("now"() + '7 days'::interval),
    "subscriptionEndsAt" timestamp(3) without time zone,
    "credits" integer DEFAULT 0 NOT NULL,
    "creditsMonthlyAllotment" integer DEFAULT 0 NOT NULL,
    "creditsRenewAt" timestamp(6) with time zone,
    "onboardingGoal" "text" DEFAULT ''::"text" NOT NULL,
    "onboardingPain" "text" DEFAULT ''::"text" NOT NULL,
    "onboardingTimeline" "text" DEFAULT ''::"text" NOT NULL,
    "tutorialDoneAt" timestamp(6) with time zone,
    "draftTone" "text" DEFAULT 'warm'::"text" NOT NULL,
    "draftLength" "text" DEFAULT 'medium'::"text" NOT NULL,
    "draftSignature" "text" DEFAULT ''::"text" NOT NULL,
    "draftSubjectStyle" "text" DEFAULT 'casual'::"text" NOT NULL,
    "digestEmailEnabled" boolean DEFAULT true NOT NULL,
    "followupEmailEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."UserDiscover" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "contactId" "text" NOT NULL,
    "rating" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."UserDiscover" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beta_feedback" (
    "id" "text" NOT NULL,
    "author" "text",
    "text" "text",
    "source" "text" DEFAULT 'groupme'::"text" NOT NULL,
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."beta_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_override" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "contact_id" "text" NOT NULL,
    "overrides" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."contact_override" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_response" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_email" "text" NOT NULL,
    "pmf" "text",
    "accuracy_score" integer,
    "onboarding_score" integer,
    "furthest_step" "text",
    "whoa" "text",
    "friction" "text",
    "weekly_use" "text",
    "willingness_to_pay" "text",
    "credits_granted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_response" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."intro_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user_id" "text" NOT NULL,
    "intermediary_name" "text" NOT NULL,
    "intermediary_email" "text",
    "target_contact_id" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."intro_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestones" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "lane" "text" NOT NULL,
    "phaseId" "text",
    "gate" "text" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "evidence" "text",
    "doneAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ops_events" (
    "id" "text" NOT NULL,
    "lane" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "ref" "text",
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ops_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phases" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "gate" "text" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "startedAt" timestamp(6) with time zone,
    "doneAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist_signups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "university" "text" NOT NULL,
    "grad_year" integer NOT NULL,
    "target_track" "text" NOT NULL,
    "linkedin_url" "text",
    "greek_affiliation" "text",
    "current_prep" "text",
    "referred_by" "text",
    "ref_code" "text",
    "email_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "email_sent_at" timestamp(6) with time zone
);


ALTER TABLE "public"."waitlist_signups" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AlumniContact"
    ADD CONSTRAINT "AlumniContact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssistantApproval"
    ADD CONSTRAINT "AssistantApproval_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssistantApproval"
    ADD CONSTRAINT "AssistantApproval_toolCallId_key" UNIQUE ("toolCallId");



ALTER TABLE ONLY "public"."AssistantConversation"
    ADD CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssistantMemory"
    ADD CONSTRAINT "AssistantMemory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssistantMessage"
    ADD CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssistantRun"
    ADD CONSTRAINT "AssistantRun_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssistantToolCall"
    ADD CONSTRAINT "AssistantToolCall_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CareerGoal"
    ADD CONSTRAINT "CareerGoal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Connection"
    ADD CONSTRAINT "Connection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ContactConnection"
    ADD CONSTRAINT "ContactConnection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."EmailEvent"
    ADD CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."EmailLog"
    ADD CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Feedback"
    ADD CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeContactActivity"
    ADD CONSTRAINT "MeContactActivity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeContactMemory"
    ADD CONSTRAINT "MeContactMemory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeContactNote"
    ADD CONSTRAINT "MeContactNote_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeContact"
    ADD CONSTRAINT "MeContact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeDiscoveryLead"
    ADD CONSTRAINT "MeDiscoveryLead_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeEvidence"
    ADD CONSTRAINT "MeEvidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MePipelineEntry"
    ADD CONSTRAINT "MePipelineEntry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MePipeline"
    ADD CONSTRAINT "MePipeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MePrepBrief"
    ADD CONSTRAINT "MePrepBrief_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeProfile"
    ADD CONSTRAINT "MeProfile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MeResume"
    ADD CONSTRAINT "MeResume_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PipelineEntry"
    ADD CONSTRAINT "PipelineEntry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Pipeline"
    ADD CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PromoCode"
    ADD CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Recommendation"
    ADD CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."UsageEvent"
    ADD CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."UserDiscover"
    ADD CONSTRAINT "UserDiscover_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beta_feedback"
    ADD CONSTRAINT "beta_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_override"
    ADD CONSTRAINT "contact_override_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_response"
    ADD CONSTRAINT "feedback_response_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_response"
    ADD CONSTRAINT "feedback_response_user_email_key" UNIQUE ("user_email");



ALTER TABLE ONLY "public"."intro_requests"
    ADD CONSTRAINT "intro_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ops_events"
    ADD CONSTRAINT "ops_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phases"
    ADD CONSTRAINT "phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist_signups"
    ADD CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "AlumniContact_linkedInUrl_key" ON "public"."AlumniContact" USING "btree" ("linkedInUrl");



CREATE INDEX "AssistantApproval_user_status_created_idx" ON "public"."AssistantApproval" USING "btree" ("userId", "status", "createdAt" DESC);



CREATE INDEX "AssistantConversation_user_updated_idx" ON "public"."AssistantConversation" USING "btree" ("userId", "updatedAt" DESC);



CREATE INDEX "AssistantMemory_user_kind_active_idx" ON "public"."AssistantMemory" USING "btree" ("userId", "kind", "active", "updatedAt" DESC);



CREATE INDEX "AssistantMessage_conversation_created_idx" ON "public"."AssistantMessage" USING "btree" ("conversationId", "createdAt");



CREATE INDEX "AssistantMessage_user_created_idx" ON "public"."AssistantMessage" USING "btree" ("userId", "createdAt" DESC);



CREATE INDEX "AssistantRun_conversation_created_idx" ON "public"."AssistantRun" USING "btree" ("conversationId", "createdAt");



CREATE INDEX "AssistantRun_user_created_idx" ON "public"."AssistantRun" USING "btree" ("userId", "createdAt" DESC);



CREATE INDEX "AssistantToolCall_run_created_idx" ON "public"."AssistantToolCall" USING "btree" ("runId", "createdAt");



CREATE INDEX "AssistantToolCall_user_status_created_idx" ON "public"."AssistantToolCall" USING "btree" ("userId", "status", "createdAt" DESC);



CREATE INDEX "CareerGoal_user_status_priority_idx" ON "public"."CareerGoal" USING "btree" ("userId", "status", "priority");



CREATE UNIQUE INDEX "Connection_userId_alumniId_key" ON "public"."Connection" USING "btree" ("userId", "alumniId");



CREATE INDEX "ContactConnection_ownerUserId_contactId_idx" ON "public"."ContactConnection" USING "btree" ("ownerUserId", "contactId");



CREATE UNIQUE INDEX "ContactConnection_ownerUserId_contactId_mutualKey_key" ON "public"."ContactConnection" USING "btree" ("ownerUserId", "contactId", "mutualKey");



CREATE INDEX "ContactConnection_ownerUserId_mutualContactId_idx" ON "public"."ContactConnection" USING "btree" ("ownerUserId", "mutualContactId");



CREATE INDEX "EmailEvent_emailId_idx" ON "public"."EmailEvent" USING "btree" ("emailId");



CREATE INDEX "EmailEvent_recipient_idx" ON "public"."EmailEvent" USING "btree" ("recipient");



CREATE INDEX "EmailLog_toEmail_idx" ON "public"."EmailLog" USING "btree" ("toEmail");



CREATE INDEX "EmailLog_type_createdAt_idx" ON "public"."EmailLog" USING "btree" ("type", "createdAt");



CREATE INDEX "MeContactActivity_userId_contactId_occurredAt_idx" ON "public"."MeContactActivity" USING "btree" ("userId", "contactId", "occurredAt");



CREATE INDEX "MeContactActivity_userId_type_occurredAt_idx" ON "public"."MeContactActivity" USING "btree" ("userId", "type", "occurredAt");



CREATE UNIQUE INDEX "MeContactMemory_contactId_key" ON "public"."MeContactMemory" USING "btree" ("contactId");



CREATE INDEX "MeContactMemory_userId_idx" ON "public"."MeContactMemory" USING "btree" ("userId");



CREATE INDEX "MeContactMemory_userId_relationshipType_idx" ON "public"."MeContactMemory" USING "btree" ("userId", "relationshipType");



CREATE INDEX "MeContactNote_userId_contactId_createdAt_idx" ON "public"."MeContactNote" USING "btree" ("userId", "contactId", "createdAt");



CREATE INDEX "MeContact_userId_idx" ON "public"."MeContact" USING "btree" ("userId");



CREATE INDEX "MeContact_userId_industry_idx" ON "public"."MeContact" USING "btree" ("userId", "industry");



CREATE UNIQUE INDEX "MeContact_userId_linkedInUrl_key" ON "public"."MeContact" USING "btree" ("userId", "linkedInUrl");



CREATE INDEX "MeContact_userId_source_idx" ON "public"."MeContact" USING "btree" ("userId", "source");



CREATE UNIQUE INDEX "MeDiscoveryLead_userId_linkedInUrl_key" ON "public"."MeDiscoveryLead" USING "btree" ("userId", "linkedInUrl");



CREATE INDEX "MeDiscoveryLead_userId_score_idx" ON "public"."MeDiscoveryLead" USING "btree" ("userId", "score");



CREATE INDEX "MeDiscoveryLead_userId_status_idx" ON "public"."MeDiscoveryLead" USING "btree" ("userId", "status");



CREATE INDEX "MeEvidence_userId_kind_idx" ON "public"."MeEvidence" USING "btree" ("userId", "kind");



CREATE INDEX "MePipelineEntry_pipelineId_idx" ON "public"."MePipelineEntry" USING "btree" ("pipelineId");



CREATE UNIQUE INDEX "MePipelineEntry_userId_contactId_pipelineId_key" ON "public"."MePipelineEntry" USING "btree" ("userId", "contactId", "pipelineId");



CREATE INDEX "MePipelineEntry_userId_idx" ON "public"."MePipelineEntry" USING "btree" ("userId");



CREATE INDEX "MePipelineEntry_userId_pipelineId_contactId_idx" ON "public"."MePipelineEntry" USING "btree" ("userId", "pipelineId", "contactId");



CREATE INDEX "MePipeline_userId_idx" ON "public"."MePipeline" USING "btree" ("userId");



CREATE INDEX "MePrepBrief_userId_contactId_idx" ON "public"."MePrepBrief" USING "btree" ("userId", "contactId");



CREATE INDEX "MePrepBrief_userId_contactId_promptVersion_memoryHash_conte_idx" ON "public"."MePrepBrief" USING "btree" ("userId", "contactId", "promptVersion", "memoryHash", "contextHash", "createdAt");



CREATE UNIQUE INDEX "MeProfile_userId_key" ON "public"."MeProfile" USING "btree" ("userId");



CREATE INDEX "MeResume_userId_updatedAt_idx" ON "public"."MeResume" USING "btree" ("userId", "updatedAt");



CREATE UNIQUE INDEX "PipelineEntry_contactId_userId_key" ON "public"."PipelineEntry" USING "btree" ("contactId", "userId");



CREATE INDEX "Pipeline_userId_idx" ON "public"."Pipeline" USING "btree" ("userId");



CREATE UNIQUE INDEX "PromoCode_code_key" ON "public"."PromoCode" USING "btree" ("code");



CREATE INDEX "Recommendation_user_status_due_idx" ON "public"."Recommendation" USING "btree" ("userId", "status", "dueAt", "createdAt" DESC);



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



CREATE INDEX "beta_feedback_source_created_idx" ON "public"."beta_feedback" USING "btree" ("source", "created_at" DESC);



CREATE UNIQUE INDEX "contact_override_user_id_contact_id_key" ON "public"."contact_override" USING "btree" ("user_id", "contact_id");



CREATE INDEX "contact_override_user_id_idx" ON "public"."contact_override" USING "btree" ("user_id");



CREATE INDEX "contact_override_user_idx" ON "public"."contact_override" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."Connection"
    ADD CONSTRAINT "Connection_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "public"."AlumniContact"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Connection"
    ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."MeContactActivity"
    ADD CONSTRAINT "MeContactActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."MeContact"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."MeContactMemory"
    ADD CONSTRAINT "MeContactMemory_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."MeContact"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."MeContactNote"
    ADD CONSTRAINT "MeContactNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."MeContact"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."MeDiscoveryLead"
    ADD CONSTRAINT "MeDiscoveryLead_savedContactId_fkey" FOREIGN KEY ("savedContactId") REFERENCES "public"."MeContact"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."MePipelineEntry"
    ADD CONSTRAINT "MePipelineEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."MeContact"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."MePipelineEntry"
    ADD CONSTRAINT "MePipelineEntry_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."MePipeline"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."MePrepBrief"
    ADD CONSTRAINT "MePrepBrief_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."MeContact"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PipelineEntry"
    ADD CONSTRAINT "PipelineEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."AlumniContact"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."PipelineEntry"
    ADD CONSTRAINT "PipelineEntry_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."Pipeline"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."UserDiscover"
    ADD CONSTRAINT "UserDiscover_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."AlumniContact"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."phases"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE "public"."AssistantApproval" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AssistantConversation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AssistantMemory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AssistantMessage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AssistantRun" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AssistantToolCall" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."CareerGoal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Recommendation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beta_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "beta_feedback deny client access" ON "public"."beta_feedback" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."contact_override" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_override deny client access" ON "public"."contact_override" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."feedback_response" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_response deny client access" ON "public"."feedback_response" TO "authenticated", "anon" USING (false) WITH CHECK (false);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."AlumniContact" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."AlumniContact" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."AlumniContact" TO "service_role";



GRANT ALL ON TABLE "public"."AssistantApproval" TO "service_role";



GRANT ALL ON TABLE "public"."AssistantConversation" TO "service_role";



GRANT ALL ON TABLE "public"."AssistantMemory" TO "service_role";



GRANT ALL ON TABLE "public"."AssistantMessage" TO "service_role";



GRANT ALL ON TABLE "public"."AssistantRun" TO "service_role";



GRANT ALL ON TABLE "public"."AssistantToolCall" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."AuditLog" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."AuditLog" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."AuditLog" TO "service_role";



GRANT ALL ON TABLE "public"."CareerGoal" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Connection" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Connection" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Connection" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ContactConnection" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ContactConnection" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ContactConnection" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."EmailEvent" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."EmailEvent" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."EmailEvent" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."EmailLog" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."EmailLog" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."EmailLog" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Feedback" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Feedback" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Feedback" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContact" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContact" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContact" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactActivity" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactActivity" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactActivity" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactMemory" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactMemory" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactMemory" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactNote" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactNote" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeContactNote" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeDiscoveryLead" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeDiscoveryLead" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeDiscoveryLead" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeEvidence" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeEvidence" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeEvidence" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePipeline" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePipeline" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePipeline" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePipelineEntry" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePipelineEntry" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePipelineEntry" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePrepBrief" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePrepBrief" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MePrepBrief" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeProfile" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeProfile" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeProfile" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeResume" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeResume" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."MeResume" TO "service_role";



GRANT ALL ON TABLE "public"."Pipeline" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."PipelineEntry" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."PipelineEntry" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."PipelineEntry" TO "service_role";



GRANT ALL ON TABLE "public"."PromoCode" TO "service_role";



GRANT ALL ON TABLE "public"."Recommendation" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."UsageEvent" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."UsageEvent" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."UsageEvent" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."User" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."User" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."User" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."UserDiscover" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."UserDiscover" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."UserDiscover" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."beta_feedback" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."beta_feedback" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."beta_feedback" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contact_override" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contact_override" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contact_override" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedback_response" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedback_response" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedback_response" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."intro_requests" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."intro_requests" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."intro_requests" TO "service_role";



GRANT ALL ON TABLE "public"."milestones" TO "service_role";



GRANT ALL ON TABLE "public"."ops_events" TO "service_role";



GRANT ALL ON TABLE "public"."phases" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."waitlist_signups" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."waitlist_signups" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."waitlist_signups" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







