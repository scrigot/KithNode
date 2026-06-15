import { auth } from "@/lib/auth";
import { LogoIcon } from "@/components/logo";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";
import { Navbar } from "./_landing/navbar";
import { HeroSection } from "./_landing/hero-section";
import { ProductCards } from "./_landing/product-cards";
import { SolutionsSection } from "./_landing/solutions-section";
import { ValueProps } from "./_landing/value-props";
import { Testimonials } from "./_landing/testimonials";
import { CTASection } from "./_landing/cta-section";
import { PanelScoring } from "@/app/demo/_components/panel-scoring";
import { PanelOutreach } from "@/app/demo/_components/panel-outreach";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const signinRequired = params.signin === "required";

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <Navbar />
      {signinRequired && (
        <div className="fixed inset-x-0 top-16 z-30 border-b border-amber-300/40 bg-amber-50/95 px-6 py-2 text-center text-[13px] font-medium text-amber-900 backdrop-blur-sm">
          Your session expired. Sign in to continue.
        </div>
      )}
      <HeroSection>
        <SignInButton />
      </HeroSection>
      <ProductCards />

      {/* Real product output: the actual demo panels (not a mockup), so visitors
          see the algorithm's real scoring + drafted outreach inline before being
          asked for anything. Addresses the "no real output anywhere" finding. */}
      <section className="relative bg-black px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0EA5E9]">
              Real output, not a mockup
            </span>
            <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              See exactly what you get
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              A scored warm path and the outreach it drafts, straight from the
              live demo with sample data. No signup to look.
            </p>
          </div>
          <div className="flex flex-col gap-8">
            <PanelScoring />
            <PanelOutreach />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white/90 backdrop-blur-sm transition-all hover:border-[#0EA5E9]/50 hover:bg-[#0EA5E9]/10 hover:text-white"
            >
              Explore the full live demo &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Transparency: plain-English how-the-score-works + data sourcing. Kills the
          black-box trust finding and establishes data origin before the request flow. */}
      <section className="relative bg-black px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0EA5E9]">
              No black box
            </span>
            <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How the score works, in plain English
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
              <h3 className="font-heading text-lg font-bold text-white">
                What the score is built from
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Every warm path is ranked on shared signals you can verify
                yourself, not a mystery algorithm:
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2.5 text-sm text-white/80">
                <li>Same school</li>
                <li>Same club or Greek org</li>
                <li>Same hometown</li>
                <li>Same major</li>
                <li>Mutual connections</li>
                <li>Firms on your target list</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
              <h3 className="font-heading text-lg font-bold text-white">
                Where the data comes from
              </h3>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-white/80">
                <li>Permitted public sources and the LinkedIn data export you choose to share.</li>
                <li>Never your LinkedIn password. We never log into your account.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <SolutionsSection />
      <ValueProps />
      <Testimonials />
      <CTASection />

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-16 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-slate-900">
              <LogoIcon className="h-7 w-7" />
              <span>
                Kith<span className="text-[#0369A1]">Node</span>
              </span>
            </span>
            <p className="text-sm text-slate-600">
              AI-powered networking intelligence for ambitious students breaking
              into finance.
            </p>
          </div>
          {/* Product */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Product</h4>
            <a
              href="#products"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Signal Detection
            </a>
            <a
              href="#products"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              AI Scoring
            </a>
            <a
              href="#products"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Smart Outreach
            </a>
            <a
              href="#products"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Discover
            </a>
          </div>
          {/* Company */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Company</h4>
            <a
              href="https://www.linkedin.com/in/samrigot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              About
            </a>
            <a
              href="https://kithnode.canny.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Feedback
            </a>
          </div>
          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
            <a
              href="/privacy"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Terms
            </a>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-slate-200 pt-8">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} KithNode &middot; Warm-path
            recruiting intelligence for 2026.
          </p>
        </div>
      </footer>
    </main>
  );
}
