import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateText } from "ai";

function getPlaceholderDraft(name: string, affiliations: string[]) {
  const warmHook = affiliations.includes("UNC Alumni") || affiliations.includes("Kenan-Flagler Alumni")
    ? "fellow Tar Heel"
    : affiliations.includes("Chi Phi")
      ? "Chi Phi brother"
      : affiliations.includes("NC Local")
        ? "fellow North Carolinian"
        : "shared connection";

  return {
    subject: `Fellow Tar Heel reaching out — coffee chat?`,
    body: `Hi ${name.split(" ")[0]},\n\nI'm a freshman at UNC studying business and came across your profile through our ${warmHook} network. Your work really stood out to me, and I'd love to hear about your experience.\n\nWould you have 15 minutes for a quick coffee chat sometime in the next couple weeks? I'd be grateful for any insight you could share.\n\nThanks so much,\nSam`,
  };
}

export async function POST(request: NextRequest) {
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

    const warmConnections = affiliationNames
      .map((a) => {
        if (a.includes("UNC Alumni") || a.includes("Kenan-Flagler")) return "fellow Tar Heel";
        if (a === "Chi Phi") return "Chi Phi brother";
        if (a === "NC Local") return "fellow North Carolinian";
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
- Sam, a freshman at UNC Chapel Hill
- Studying business, interested in finance (IB, PE, consulting)
- Member of Chi Phi fraternity
- Genuine interest in learning from professionals

TONE REQUIREMENTS:
- Authentic and warm, NOT spammy or templated
- Concise — max 150 words for the body
- Reference the specific warm connection (e.g., "fellow Tar Heel", "Kenan-Flagler connection")
- Humble and curious, not presumptuous
- Clear ask: 15-minute coffee chat / virtual call
- Sign off as "Sam"

Return ONLY valid JSON with exactly two keys:
{"subject": "...", "body": "..."}

The subject should be casual and warm, under 60 characters. The body should feel like a real person wrote it, not AI.`;

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4.6",
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
      subject = `Coffee chat — ${warmConnections || "reaching out"}`;
      draft = text;
    }

    if (!subject || !draft) {
      const placeholder = getPlaceholderDraft(contact.name, affiliationNames);
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
      const placeholder = getPlaceholderDraft(contact?.name || "there", affiliationNames);
      return NextResponse.json({ draft: placeholder.body, subject: placeholder.subject });
    } catch {
      return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
    }
  }
}
