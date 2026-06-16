import { auth } from "@/lib/auth";
import { LogoIcon } from "@/components/logo";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";
import { Navbar } from "./_landing/navbar";
import { HeroSection } from "./_landing/hero-section";
import { SectionImportRank } from "./_landing/section-import-rank";
import { SectionEmailMac } from "./_landing/section-email-mac";
import { SectionOutpace } from "./_landing/section-outpace";
import { Testimonials } from "./_landing/testimonials";
import { CTASection } from "./_landing/cta-section";
import { FAQ } from "./_landing/faq";
import { MeshBg } from "./_landing/mesh-bg";
import { PanelScoring } from "@/app/demo/_components/panel-scoring";
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
      <SectionImportRank />

      <section className="relative bg-black px-4 py-24 sm:py-32">
        <MeshBg />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0EA5E9]">
              The math, not magic
            </span>
            <h2 className="mt-5 font-heading text-5xl font-medium leading-[1.25] tracking-[-0.027em] text-white">
              Every path, scored so you know who to talk to first.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              Same school, same club, mutual connections, a firm on your list. You see every signal behind the number, no black box.
            </p>
          </div>
          <PanelScoring />
          <div className="mt-10 text-center">
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-[12px] border border-white/20 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white/90 backdrop-blur-sm transition-all hover:border-[#0EA5E9]/50 hover:bg-[#0EA5E9]/10 hover:text-white">
              Explore the full live demo &rarr;
            </Link>
          </div>
        </div>
      </section>

      <SectionEmailMac />
      <SectionOutpace />

      <Testimonials />
      <FAQ />
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
              href="/manifesto"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Why KithNode
            </a>
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
