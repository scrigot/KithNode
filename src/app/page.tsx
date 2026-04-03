import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";
import { Navbar } from "./_landing/navbar";
import { HeroSection } from "./_landing/hero-section";
import { StatsSection } from "./_landing/stats-section";
import { HowItWorksSection } from "./_landing/how-it-works-section";
import { FeaturesSection } from "./_landing/features-section";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="grain-overlay relative min-h-screen overflow-hidden bg-bg-primary">
      {/* Navbar */}
      <Navbar />

      {/* Hero */}
      <HeroSection>
        <SignInButton />
      </HeroSection>

      {/* Stats */}
      <StatsSection />

      {/* How it works */}
      <HowItWorksSection />

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
