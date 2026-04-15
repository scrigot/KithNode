import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";
import { Navbar } from "./_landing/navbar";
import { HeroSection } from "./_landing/hero-section";
import { ProductCards } from "./_landing/product-cards";
import { Showcase } from "./_landing/showcase";
import { Testimonials } from "./_landing/testimonials";
import { CTASection } from "./_landing/cta-section";
import { ReelEmbed } from "./_landing/reel-embed";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <Navbar />
      <HeroSection>
        <SignInButton />
      </HeroSection>
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-[1200px]">
          <ReelEmbed />
        </div>
      </section>
      <ProductCards />
      <Showcase />
      <Testimonials />
      <CTASection />

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-16 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="font-heading text-lg font-bold tracking-tight">
              <span className="text-slate-900">Kith</span>
              <span className="text-accent-teal">Node</span>
            </span>
            <p className="text-sm text-slate-600">
              AI-powered networking intelligence for ambitious students breaking into finance.
            </p>
          </div>
          {/* Product */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Product</h4>
            <a href="#products" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Signal Detection</a>
            <a href="#products" className="text-sm text-slate-600 transition-colors hover:text-slate-900">AI Scoring</a>
            <a href="#products" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Smart Outreach</a>
            <a href="#products" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Discover</a>
          </div>
          {/* Company */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Company</h4>
            <a href="https://www.linkedin.com/in/samrigot" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 transition-colors hover:text-slate-900">About</a>
            <a href="https://kithnode.canny.io" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Feedback</a>
          </div>
          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
            <a href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Privacy</a>
            <a href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Terms</a>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-slate-200 pt-8">
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} KithNode. A UNC Chapel Hill startup by Sam Rigot.</p>
        </div>
      </footer>
    </main>
  );
}
