import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ActivityBar } from "./_components/activity-bar";

export const metadata = {
  title: "Office — KithNode",
  description: "AgentOffice: walk into a room, chat with an agent.",
};

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/sign-in?callbackUrl=/office");
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <ActivityBar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
