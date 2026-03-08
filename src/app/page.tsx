import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
        KithNode
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg text-gray-600">
        Build authentic connections with alumni who&apos;ve walked your path.
        Intelligence-driven networking for IB, PE, and Consulting recruiting.
      </p>
      <SignInButton />
    </main>
  );
}
