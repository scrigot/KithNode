import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

function getPlaceholderDraft(name: string, affiliations: string[]) {
  const warmHook = affiliations.includes("UNC Alumni")
    ? "fellow Tar Heel"
    : affiliations.includes("Chi Phi")
      ? "Chi Phi brother"
      : affiliations.includes("Kenan-Flagler")
        ? "Kenan-Flagler connection"
        : "connection";

  return {
    subject: `Fellow Tar Heel reaching out — coffee chat?`,
    body: `Hi ${name.split(" ")[0]},\n\nI'm a freshman at UNC studying business and came across your profile through our ${warmHook} network. Your work really stood out to me, and I'd love to hear about your experience.\n\nWould you have 15 minutes for a quick coffee chat sometime in the next couple weeks? I'd be grateful for any insight you could share.\n\nThanks so much,\nSam`,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json(
      { error: "contactId is required" },
      { status: 400 },
    );
  }

  try {
    // Fetch contact with company data from Supabase
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, name, title, email, education, company_id")
      .eq("id", contactId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 },
      );
    }

    // Fetch company
    const { data: company } = await supabase
      .from("companies")
      .select("name, location, industry_tags")
      .eq("id", contact.company_id)
      .single();

    // Fetch affiliations
    const { data: affiliations } = await supabase
      .from("affiliations")
      .select("name, boost")
      .eq("contact_id", contactId);

    const affiliationNames = (affiliations || []).map((a: { name: string }) => a.name);
    const companyName = company?.name || "";
    const companyLocation = company?.location || "";
    const industryTags = company?.industry_tags || [];

    // If no API key, return placeholder
    if (!process.env.ANTHROPIC_API_KEY) {
      const placeholder = getPlaceholderDraft(contact.name, affiliationNames);
      return NextResponse.json({
        draft: placeholder.body,
        subject: placeholder.subject,
        outreachId: null,
      });
    }

    // Build the prompt
    const warmConnections = affiliationNames
      .map((a: string) => {
        if (a === "UNC Alumni" || a === "UNC Faculty") return "fellow Tar Heel";
        if (a === "Chi Phi") return "Chi Phi brother";
        if (a === "Kenan-Flagler") return "Kenan-Flagler connection";
        if (a === "NC Local") return "fellow North Carolinian";
        return a;
      })
      .join(", ");

    const prompt = `Generate a personalized warm outreach email requesting a 15-minute coffee chat.

CONTACT INFO:
- Name: ${contact.name}
- Title: ${contact.title || "Unknown"}
- Company: ${companyName}
- Location: ${companyLocation}
- Education: ${contact.education || "Unknown"}
- Industry: ${Array.isArray(industryTags) ? industryTags.join(", ") : industryTags}
- Affiliations/Warm Path: ${affiliationNames.join(", ") || "None"}
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

    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((b) => b.type === "text");
    const rawText = textBlock?.text || "";

    // Parse JSON from response
    let subject = "";
    let draft = "";

    try {
      // Try to extract JSON — Claude sometimes wraps in markdown code blocks
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        subject = parsed.subject || "";
        draft = parsed.body || "";
      }
    } catch {
      // If JSON parsing fails, use the raw text as the body
      subject = `Coffee chat — ${warmConnections || "reaching out"}`;
      draft = rawText;
    }

    // Fallback if empty
    if (!subject || !draft) {
      const placeholder = getPlaceholderDraft(contact.name, affiliationNames);
      subject = placeholder.subject;
      draft = placeholder.body;
    }

    return NextResponse.json({
      draft,
      subject,
      outreachId: null,
    });
  } catch (error) {
    console.error("Outreach draft error:", error);
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 },
    );
  }
}
