import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { MessagesClient } from "./messages-client";

// Flag + auth gate at the server layer (notFound, not redirect) so the route is
// invisible when the feature is off.
export default async function MessagesPage() {
  const session = await auth();
  if (!KITH_NODES_ENABLED || !session?.user?.email) notFound();
  return <MessagesClient />;
}
