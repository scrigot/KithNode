import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] py-24 px-4">
      {/* Decorative circles */}
      <div className="absolute top-10 -left-20 h-60 w-60 rounded-full bg-white/5" />
      <div className="absolute -bottom-20 right-10 h-80 w-80 rounded-full bg-white/5" />

      <div className="relative mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to network smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/85">
            Private alpha opening to 50 students this spring. Tell Sam where you&apos;re recruiting.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/waitlist"
              className="rounded-lg bg-white px-10 py-4 text-base font-semibold text-[#0EA5E9] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              Request Access
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">
            Free during alpha &middot; 6 questions, 90 seconds
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
