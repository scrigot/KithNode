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
    <section id="faq" className="relative bg-black px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((item) => (
            <details key={item.q} className="group rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                {item.q}
                <span className="text-[#0EA5E9] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
