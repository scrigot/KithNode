import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { NodeDetailClient } from "./node-detail-client";

export default async function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!KITH_NODES_ENABLED || !session?.user?.email) notFound();
  const { id } = await params;
  return <NodeDetailClient nodeId={id} me={session.user.email} />;
}
