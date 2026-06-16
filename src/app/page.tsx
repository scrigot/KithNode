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
    <main className="relative min-h-screen overflow-hidden bg-black">
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
          <div className="text-center">
            <h2 className="font-heading text-4xl font-medium leading-[1.25] tracking-[-0.027em] text-white sm:text-5xl">
              Every path, scored so you know who to talk to first.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              Same school, same club, mutual connections, a firm on your list. You see every signal behind the number, no black box.
            </p>
          </div>
          <div className="relative mt-14 sm:mt-16">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[min(90%,56rem)] -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(14,165,233,0.16), transparent 70%)",
              }}
            />
            <div className="relative mx-auto max-w-5xl">
              <PanelScoring />
            </div>
          </div>
        </div>
      </section>

      <SectionEmailMac />
      <SectionOutpace />

      <Testimonials />
      <FAQ />
      <CTASection />

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black px-6 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-white">
              <LogoIcon className="h-7 w-7" />
              <span>
                Kith<span className="text-[#0EA5E9]">Node</span>
              </span>
            </span>
            <p className="text-sm text-white/55">
              AI-powered networking intelligence for ambitious students breaking
              into finance.
            </p>
          </div>
          {/* Product */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <a
              href="/demo"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Signal Detection
            </a>
            <a
              href="/demo"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              AI Scoring
            </a>
            <a
              href="/demo"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Smart Outreach
            </a>
            <a
              href="/demo"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Discover
            </a>
          </div>
          {/* Company */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <a
              href="/manifesto"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Why KithNode
            </a>
            <a
              href="https://www.linkedin.com/in/samrigot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              About
            </a>
            <a
              href="https://kithnode.canny.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Feedback
            </a>
          </div>
          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <a
              href="/privacy"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Terms
            </a>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 pt-8">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} KithNode &middot; Warm-path
            recruiting intelligence for 2026.
          </p>
        </div>
      </footer>
    </main>
  );
}
