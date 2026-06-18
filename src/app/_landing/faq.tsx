"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MeshBg } from "./mesh-bg";

const FAQS: { q: string; a: string }[] = [
  { q: "Will this get my LinkedIn restricted or banned?", a: "No. KithNode never automates, scrapes, or logs into your LinkedIn. Nothing runs on your account, and nothing sends on its own. You copy each message and send it yourself." },
  { q: "Where does the contact data come from?", a: "Permitted public sources and the LinkedIn data export you choose to share. Never your private account, never your password." },
  { q: "How is the warmth score calculated?", a: "Real shared signals you can verify yourself: same school, club, Greek org, hometown, major, mutual connections, and whether they sit at a firm on your target list. You see every signal behind the score." },
  { q: "Will recruiters know it's AI?", a: "The draft is a starting point grounded in a real shared connection, and you edit it before you send it. It is not a template blast, and it is not sent automatically." },
  { q: "Is it free?", a: "Free for the founding cohort." },
  { q: "Who is it for?", a: "Students breaking into finance (investment banking, private equity, consulting) who would rather walk in warm than cold-email strangers." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-20"
    >
      <MeshBg />
      <div className="relative w-full max-w-6xl lg:w-[90%]">
        <h2 className="font-heading text-4xl font-medium leading-[1.25] tracking-[-0.027em] text-white sm:text-5xl">
          Frequently asked questions
        </h2>
        <div className="mt-12 border-t border-white/10 sm:mt-16">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-white/10">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left text-lg font-medium text-white sm:py-6"
                >
                  {item.q}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-out ${
                      isOpen ? "rotate-180 text-[#0EA5E9]" : "text-white/40"
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-white/65">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
