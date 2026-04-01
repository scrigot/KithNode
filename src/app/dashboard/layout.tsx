import { Sidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: re-enable auth after Google OAuth is configured
  // const session = await auth();
  // if (!session?.user) redirect("/");

  const userName = process.env.NODE_ENV === "development" ? "Sam Rigot" : "User";

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar userName={userName} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
