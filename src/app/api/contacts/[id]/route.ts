import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContactDetail } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // TODO: re-enable auth after Google OAuth is configured
  // const session = await auth();
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  const { id } = await params;

  try {
    const contact = await getContactDetail(Number(id));
    return NextResponse.json(contact);
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: "Contact not found" },
      { status },
    );
  }
}
