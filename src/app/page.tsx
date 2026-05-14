import { auth } from "@/lib/auth";
import { LogoIcon } from "@/components/logo";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";
import { Navbar } from "./_landing/navbar";
import { HeroSection } from "./_landing/hero-section";
import { ProductCards } from "./_landing/product-cards";
import { SolutionsSection } from "./_landing/solutions-section";
import { ValueProps } from "./_landing/value-props";
import { Showcase } from "./_landing/showcase";
import { Testimonials } from "./_landing/testimonials";
import { CTASection } from "./_landing/cta-section";

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
      <SolutionsSection />
      <ValueProps />
      <Showcase />
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
