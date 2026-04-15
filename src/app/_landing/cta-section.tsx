"use client";

import { signIn } from "next-auth/react";
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
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/80">
            Join the private alpha and start surfacing your warmest connections today.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-[#0EA5E9] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Get Started with Google
            </button>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Currently available for UNC students &middot; Free during alpha
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
