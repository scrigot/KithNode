import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";
import { UpgradeToast } from "./upgrade-toast";
import { DashboardTour } from "@/components/dashboard-tour";
import { HelpWidget } from "@/components/help-widget";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { getUserPrefs } from "@/lib/user-prefs";
import { checkSubscription } from "@/lib/subscription";

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
    // Subscription gate: no active subscription or trial → activation flow.
    // The post-checkout race (webhook may lag the redirect) is handled BEFORE
    // the user reaches here: Stripe's success_url points at /checkout/success,
    // which verifies the paid session and activates before sending them on.
    const access = await checkSubscription(email);
    if (!access.allow) {
      redirect("/onboarding?activate=1");
    }
  }

  return (
    <div className="product-shell flex h-screen min-h-0 bg-canvas text-text-primary">
      <Sidebar isFounderUser={founder} userName={userName} />
      <main className="min-w-0 flex-1 overflow-auto bg-canvas pt-14 lg:pt-0">
        {children}
      </main>
      <UpgradeToast />
      <DashboardTour />
      <HelpWidget />
    </div>
  );
}
