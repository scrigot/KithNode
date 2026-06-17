import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { canAccessThread } from "@/lib/kith/messaging";
import { getUserNames } from "@/lib/kith/users";
import { ChatThread } from "@/app/dashboard/_components/chat-thread";

// DM thread view. The threadId is the sorted "emailA|emailB" pair key. We verify
// access server-side (defense in depth — the hook also guards) and resolve the
// other participant's display name for the header.
export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await auth();
  if (!KITH_NODES_ENABLED || !session?.user?.email) notFound();

  const { threadId: raw } = await params;
  const threadId = decodeURIComponent(raw);
  const me = session.user.email.trim().toLowerCase();

  if (!(await canAccessThread(me, "dm", threadId))) notFound();

  const otherEmail = threadId.split("|").find((e) => e !== me) ?? threadId;
  const names = await getUserNames([otherEmail]);
  const otherName = names.get(otherEmail) ?? otherEmail;

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col px-6 py-6 lg:h-screen">
      <ChatThread threadType="dm" threadId={threadId} title={otherName} />
    </div>
  );
}
