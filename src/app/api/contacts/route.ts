import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContactsRanked } from "@/lib/api";

export async function GET() {
  // TODO: re-enable auth after Google OAuth is configured
  // const session = await auth();
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const contacts = await getContactsRanked();
    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
