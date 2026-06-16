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
  return (
    <section id="faq" className="relative bg-black px-4 py-24 sm:py-32">
      <MeshBg />
      <div className="relative mx-auto max-w-4xl">
        <h2 className="font-heading text-4xl font-medium leading-[1.25] tracking-[-0.027em] text-white sm:text-5xl">
          Questions, answered
        </h2>
        <div className="mt-12 border-t border-white/10 sm:mt-16">
          {FAQS.map((item) => (
            <details key={item.q} className="group border-b border-white/10">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium text-white sm:py-6">
                {item.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 ease-out group-open:rotate-180 group-open:text-[#0EA5E9]" />
              </summary>
              <p className="max-w-3xl pb-6 text-[15px] leading-relaxed text-white/65">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
