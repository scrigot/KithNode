import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { UpgradeToast } from "./upgrade-toast";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const userName = session?.user?.name || "User";

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar userName={userName} />
      <div className="flex flex-1 flex-col overflow-hidden pt-[49px] lg:pt-0">
        <TopBar userName={userName} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <UpgradeToast />
    </div>
  );
}
