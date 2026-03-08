import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back, {session.user.name}
            </p>
          </div>
          <SignOutButton />
        </div>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-gray-600">
            Your networking intelligence hub is coming soon.
          </p>
          <Link
            href="/dashboard/contacts"
            className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            View Alumni Contacts
          </Link>
        </div>
      </div>
    </main>
  );
}
