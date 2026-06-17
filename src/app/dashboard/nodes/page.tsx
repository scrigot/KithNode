import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { NodesClient } from "./nodes-client";

export default async function NodesPage() {
  const session = await auth();
  if (!KITH_NODES_ENABLED || !session?.user?.email) notFound();
  return <NodesClient />;
}
