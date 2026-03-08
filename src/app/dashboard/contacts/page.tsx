import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ContactsTable } from "./contacts-table";

export default async function ContactsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Alumni Contacts
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Your network connections, ranked by strength score.
          </p>
        </div>
        <ContactsTable />
      </div>
    </main>
  );
}
