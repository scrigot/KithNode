import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";
import { HeroSection } from "./_landing/hero-section";
import { StatsSection } from "./_landing/stats-section";
import { FeaturesSection } from "./_landing/features-section";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="grain-overlay relative min-h-screen overflow-hidden bg-bg-primary">
      {/* Gradient mesh background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-accent-teal/15 blur-[128px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent-amber/10 blur-[128px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/8 blur-[128px]" />
      </div>

      {/* Hero */}
      <HeroSection>
        <SignInButton />
      </HeroSection>

      {/* Stats */}
      <StatsSection />

      {/* Features */}
      <FeaturesSection />

      {/* Footer */}
      <footer className="relative border-t border-white/[0.06] px-4 py-10 text-center">
        <p className="text-sm text-text-secondary">
          A UNC Chapel Hill startup by{" "}
          <a
            href="https://www.linkedin.com/in/samrigot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-teal transition-colors hover:text-accent-teal/80"
          >
            Sam Rigot
          </a>
        </p>
        <p className="mt-3 text-xs text-text-muted">
          &copy; {new Date().getFullYear()} KithNode &middot;{" "}
          <a
            href="https://kithnode.canny.io"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent-teal"
          >
            Send Feedback
          </a>
        </p>
      </footer>
    </main>
  );
}
