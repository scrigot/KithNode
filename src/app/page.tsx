import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <h1 className="text-4xl font-bold tracking-tight text-accent-green sm:text-6xl">
        KITHNODE
      </h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-text-muted">
        warm signals intelligence
      </p>
      <p className="mt-6 max-w-md text-center text-sm text-text-secondary">
        Surface your strongest alumni connections. AI-powered scoring, signal
        detection, and authentic outreach — built for UNC finance students.
      </p>
      <div className="mt-8">
        <SignInButton />
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Alpha access restricted to @unc.edu emails
      </p>
    </main>
  );
}
