import { Sidebar } from "./sidebar";
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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
