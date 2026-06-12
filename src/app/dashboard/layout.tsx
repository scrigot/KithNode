import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { UpgradeToast } from "./upgrade-toast";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { getUserPrefs } from "@/lib/user-prefs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const userName = session?.user?.name || "User";
  const founder = isFounder(session);

  // First-run gate: a new user has a freshly-upserted User row (university
  // defaults to "" — see auth.ts signIn upsert). Force them through onboarding
  // before they can reach any dashboard page. Founders are never gated.
  // /onboarding lives outside /dashboard, so this never loops.
  const email = session?.user?.email;
  if (email && !founder) {
    const prefs = await getUserPrefs(email);
    if (prefs.university === "") {
      redirect("/onboarding");
    }
  }

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar userName={userName} isFounderUser={founder} />
      <div className="flex flex-1 flex-col overflow-hidden pt-[49px] lg:pt-0">
        <TopBar userName={userName} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <UpgradeToast />
    </div>
  );
}
