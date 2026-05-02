import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs, type UserPrefs } from "@/lib/user-prefs";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { requireSubscription } from "@/lib/subscription";

function shortSchoolName(university: string): string {
  const u = university.toLowerCase();
  if (u.includes("north carolina") || u.includes("chapel hill")) return "UNC";
  if (u.includes("pennsylvania") || u.includes("upenn")) return "Penn";
  if (u.includes("virginia")) return "UVA";
  if (u.includes("michigan")) return "Michigan";
  if (u.includes("california, berkeley")) return "Berkeley";
  if (u.includes("new york university")) return "NYU";
  return university.split(/[\s,]+/)[0] || "school";
}

function schoolMascot(university: string): string {
  const u = university.toLowerCase();
  if (u.includes("north carolina") || u.includes("chapel hill")) return "Tar Heel";
  if (u.includes("duke")) return "Blue Devil";
  if (u.includes("michigan")) return "Wolverine";
  if (u.includes("pennsylvania")) return "Quaker";
  if (u.includes("virginia")) return "Cavalier";
  if (u.includes("notre dame")) return "Domer";
  return "alum";
}

function getPlaceholderDraft(
  contactName: string,
  affiliations: string[],
  prefs: UserPrefs,
  senderFirstName: string,
) {
  const userMascot = prefs.university ? schoolMascot(prefs.university) : "fellow student";
  const userSchool = prefs.university ? shortSchoolName(prefs.university) : "my school";

  const warmHook = affiliations.includes("Same School")
    ? `fellow ${userMascot}`
    : affiliations.includes("Same Greek Org") && prefs.greekOrg
      ? `${prefs.greekOrg} brother`
      : affiliations.includes("Hometown Match")
        ? "fellow local"
        : affiliations.includes("Target Firm")
          ? "shared interest in your firm"
          : "shared connection";

  return {
    subject: `Quick coffee chat, ${userMascot} reaching out`,
    body: `Hi ${contactName.split(" ")[0]},\n\nI'm a student at ${userSchool} and came across your profile through our ${warmHook}. Your work really stood out to me, and I'd love to hear about your experience.\n\nWould you have 15 minutes for a quick coffee chat sometime in the next couple weeks? I'd be grateful for any insight you could share.\n\nThanks so much,\n${senderFirstName}`,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const senderFullName = session?.user?.name || "";
  const senderFirstName = senderFullName.split(" ")[0] || "Me";

  const gate = await requireSubscription(userEmail);
  if (gate) return gate;

  const prefs = await getUserPrefs(userEmail);

  const body = await request.json();
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  try {
    const { data: contact, error: contactError } = await supabase
      .from("AlumniContact")
      .select("*")
      .eq("id", contactId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const affiliationNames: string[] = contact.affiliations
      ? contact.affiliations.split(",").filter(Boolean).map((s: string) => s.trim())
      : [];

    const userMascot = prefs.university ? schoolMascot(prefs.university) : "fellow student";
    const userSchool = prefs.university || "my school";
    const userIndustryFocus =
      prefs.targetIndustries.length > 0 ? prefs.targetIndustries.join(", ") : "finance";
    const userGreek = prefs.greekOrg || "";

    const warmConnections = affiliationNames
      .map((a) => {
        if (a === "Same School") return `fellow ${userMascot}`;
        if (a === "Same Greek Org" && userGreek) return `${userGreek} brother`;
        if (a === "Hometown Match") return "fellow local";
        if (a === "Target Firm") return "shared interest in your firm";
        return a;
      })
      .join(", ");

    const prompt = `Generate a personalized warm outreach email requesting a 15-minute coffee chat.

CONTACT INFO:
- Name: ${contact.name}
- Title: ${contact.title || "Unknown"}
- Company: ${contact.firmName || "Unknown"}
- Location: ${contact.location || "Unknown"}
- Education: ${contact.education || "Unknown"}
- Affiliations: ${affiliationNames.join(", ") || "None"}
- Warm Connection Phrases: ${warmConnections || "professional connection"}

SENDER CONTEXT:
- ${senderFullName || "Me"}, a student at ${userSchool}
- Interested in ${userIndustryFocus}
${userGreek ? `- Member of ${userGreek}` : ""}
- Genuine interest in learning from professionals

TONE REQUIREMENTS:
- Authentic and warm, NOT spammy or templated
- Concise, max 150 words for the body
- Reference the specific warm connection if one exists (e.g., "fellow ${userMascot}"${userGreek ? `, "${userGreek} brother"` : ""})
- Humble and curious, not presumptuous
- Clear ask: 15-minute coffee chat / virtual call
- Sign off with the sender's first name: "${senderFirstName}"

Return ONLY valid JSON with exactly two keys:
{"subject": "...", "body": "..."}

The subject should be casual and warm, under 60 characters. The body should feel like a real person wrote it, not AI.`;

    const { text } = await generateText({
      model: gateway("anthropic/claude-sonnet-4.5"),
      prompt,
    });

    let subject = "";
    let draft = "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        subject = parsed.subject || "";
        draft = parsed.body || "";
      }
    } catch {
      subject = `Coffee chat, ${warmConnections || "reaching out"}`;
      draft = text;
    }

    if (!subject || !draft) {
      const placeholder = getPlaceholderDraft(contact.name, affiliationNames, prefs, senderFirstName);
      subject = placeholder.subject;
      draft = placeholder.body;
    }

    return NextResponse.json({ draft, subject });
  } catch (error) {
    console.error("Outreach draft error:", error);
    // Fallback to placeholder if AI Gateway is unavailable (e.g., local dev without OIDC)
    try {
      const { data: contact } = await supabase
        .from("AlumniContact")
        .select("name, affiliations")
        .eq("id", contactId)
        .single();
      const affiliationNames: string[] = contact?.affiliations
        ? contact.affiliations.split(",").filter(Boolean).map((s: string) => s.trim())
        : [];
      const placeholder = getPlaceholderDraft(
        contact?.name || "there",
        affiliationNames,
        prefs,
        senderFirstName,
      );
      return NextResponse.json({ draft: placeholder.body, subject: placeholder.subject });
    } catch {
      return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
    }
  }
}
