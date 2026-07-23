import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { data: output, error } = await supabase.rpc("undo_assistant_action", {
    p_user_id: userId,
    p_action_id: id,
  });

  if (!error) return NextResponse.json({ status: "undone", output, receipt: output });
  if (error.code === "P0002") {
    return NextResponse.json(
      { error: "action_not_found", message: "This recorded action could not be found." },
      { status: 404 },
    );
  }
  if (error.code === "55000") {
    return NextResponse.json(
      { error: "undo_unavailable", message: "This action can no longer be undone. Refresh the conversation to see its latest state." },
      { status: 409 },
    );
  }
  if (error.code === "PGRST202" || error.code === "42883") {
    return NextResponse.json(
      { error: "undo_unavailable", message: "Undo is temporarily unavailable. The action receipt is preserved; retry after the database update completes." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { error: "undo_failed", message: "KithNode could not undo this change. No additional change was made." },
    { status: 500 },
  );
}
