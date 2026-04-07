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
      <footer className="relative border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="flex flex-col gap-2">
            <span className="font-heading text-base font-bold tracking-tight">
              <span className="text-text-primary">Kith</span>
              <span className="text-accent-teal">Node</span>
            </span>
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
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} KithNode &middot; v1.0.0
            </p>
          </div>
          {/* Right */}
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <a href="#" className="transition-colors hover:text-text-secondary">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-text-secondary">
              Terms
            </a>
            <a
              href="https://kithnode.canny.io"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-accent-teal"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
