import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { OpsCockpit } from "./_components/ops-cockpit";

// Founder-only. notFound() (404, not redirect) so non-founders cannot confirm
// the route exists. The API route enforces the same gate as the real security
// boundary; this is defense-in-depth at the page layer.
export default async function OpsPage() {
  const session = await auth();
  if (!isFounder(session)) notFound();

  return <OpsCockpit />;
}
