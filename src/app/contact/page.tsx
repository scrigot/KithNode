import Link from "next/link";

export const metadata = {
  title: "Contact",
  description: "Get in touch with KithNode.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#F1F5F9]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          &larr; Back
        </Link>

        <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900">
          Contact
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          KithNode is a pre-launch product built by Sam Rigot. Reach out for
          access, partnerships, press, or to delete your data.
        </p>

        <div className="mt-10 space-y-8 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Email</h2>
            <p className="mt-3 leading-relaxed">
              <a
                href="mailto:samrigot31@gmail.com"
                className="text-[#0EA5E9] hover:underline"
              >
                samrigot31@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              Waitlist access
            </h2>
            <p className="mt-3 leading-relaxed">
              Join the private alpha at{" "}
              <Link
                href="/waitlist"
                className="text-[#0EA5E9] hover:underline"
              >
                /waitlist
              </Link>
              . Invitations are issued in cohorts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              Data requests
            </h2>
            <p className="mt-3 leading-relaxed">
              To access, correct, or delete data we hold about you, email the
              address above. We respond within 30 days. See the{" "}
              <Link href="/privacy" className="text-[#0EA5E9] hover:underline">
                Privacy Policy
              </Link>{" "}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Location</h2>
            <p className="mt-3 leading-relaxed">Chapel Hill, North Carolina, USA.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
