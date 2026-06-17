import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { FriendsClient } from "./friends-client";

// Flag + auth gate at the server layer (notFound, not redirect) so the route is
// invisible when the feature is off.
export default async function FriendsPage() {
  const session = await auth();
  if (!KITH_NODES_ENABLED || !session?.user?.email) notFound();
  return <FriendsClient />;
}
