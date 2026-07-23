import { CareerCopilotWorkspace } from "@/components/career-copilot-workspace";
import { auth } from "@/lib/auth";

export default async function DashboardHomePage() {
  const session = await auth();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || "there";

  return <CareerCopilotWorkspace userName={firstName} />;
}
