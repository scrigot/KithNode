import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How KithNode collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: 2026-04-22</p>

        <div className="mt-10 space-y-10 text-slate-700">
          {/* 1. Data We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              1. Data We Collect
            </h2>
            <p className="mt-3 leading-relaxed">
              When you submit the waitlist form, we collect the following
              information you provide directly:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed">
              <li>
                <strong>Email address</strong> (required). Used to contact you
                about access and product updates.
              </li>
              <li>
                <strong>Full name</strong> (required). Used to personalize
                communications.
              </li>
              <li>
                <strong>University</strong> (required). Used to understand which
                schools are represented on the waitlist.
              </li>
              <li>
                <strong>Graduation year</strong> (required). Used to prioritize
                cohort selection.
              </li>
              <li>
                <strong>Target track</strong> (required). The finance career
                path you indicated (e.g., Investment Banking, Private Equity).
              </li>
              <li>
                <strong>LinkedIn URL</strong> (optional). Used to verify
                identity and review your background before granting access.
              </li>
              <li>
                <strong>Free-text recruiting context</strong> (optional, labeled
                "What&apos;s broken in your recruiting right now?"). Read
                directly by the founder to improve the product.
              </li>
              <li>
                <strong>Referral code</strong> (optional). A URL parameter
                indicating who referred you, stored to attribute referrals.
              </li>
              <li>
                <strong>Generated referral code</strong>. A unique code assigned
                to your submission so you can refer others.
              </li>
            </ul>
            <p className="mt-4 leading-relaxed">
              We do not knowingly collect data from individuals under 13 years
              of age. The service is directed at college students. If you are
              under 13, do not submit this form.
            </p>
            <p className="mt-4 leading-relaxed">
              Product experiences may combine information you provide with
              publicly available profile and affiliation signals to help rank
              likely warm paths. We do not sell personal information, and you
              can request deletion at any time using the contact details below.
            </p>
          </section>

          {/* 2. How We Use It */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              2. How We Use Your Data
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed">
              <li>
                To evaluate your waitlist application and decide whether to
                invite you to the private alpha.
              </li>
              <li>
                To send a confirmation email when you join the waitlist and
                subsequent updates about your application status.
              </li>
              <li>To generate and track your personal referral link.</li>
              <li>
                To understand aggregate demand by university, track, and
                graduation year for product and cohort planning.
              </li>
              <li>
                To monitor usage of the waitlist page and improve the form
                experience (via analytics described in Section 7).
              </li>
            </ul>
            <p className="mt-4 leading-relaxed">
              We do not sell your personal information. We do not use your data
              for advertising.
            </p>
          </section>

          {/* 3. Processors */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              3. Third-Party Processors
            </h2>
            <p className="mt-3 leading-relaxed">
              Your data is processed by the following sub-processors. Each
              processes only the data necessary for its function.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Processor
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Purpose
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Data transferred
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium">Supabase</td>
                    <td className="px-4 py-3">Database storage</td>
                    <td className="px-4 py-3">
                      All waitlist fields listed above
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Vercel</td>
                    <td className="px-4 py-3">
                      Hosting and serverless compute
                    </td>
                    <td className="px-4 py-3">
                      Request data (IP address, user agent) processed in
                      transit; not stored by us beyond server logs
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Resend</td>
                    <td className="px-4 py-3">Transactional email delivery</td>
                    <td className="px-4 py-3">
                      Email address and full name for confirmation email
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">PostHog</td>
                    <td className="px-4 py-3">
                      Product analytics and page view tracking
                    </td>
                    <td className="px-4 py-3">
                      Anonymous usage events, IP address, browser metadata
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* TODO: legal review. Confirm Supabase DPA is in place and data residency region is acceptable for your user base */}
          </section>

          {/* 4. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              4. Data Retention
            </h2>
            <p className="mt-3 leading-relaxed">
              Waitlist records are retained for as long as the waitlist program
              is active and for a reasonable period afterward to maintain
              records of cohort invitations. If you request deletion (see
              Section 5), we will remove your record from the active database
              within 30 days. Aggregate, de-identified statistics derived from
              waitlist submissions may be retained indefinitely.
            </p>
          </section>

          {/* 5. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              5. Your Rights
            </h2>
            <p className="mt-3 leading-relaxed">
              You may contact us at any time to:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed">
              <li>
                <strong>Access</strong> the personal information we hold about
                you.
              </li>
              <li>
                <strong>Correct</strong> inaccurate or incomplete information.
              </li>
              <li>
                <strong>Delete</strong> your record from the waitlist database.
              </li>
            </ul>
            <p className="mt-4 leading-relaxed">
              To exercise any of these rights, email{" "}
              <a
                href="mailto:samrigot31@gmail.com"
                className="text-[#0EA5E9] hover:underline"
              >
                samrigot31@gmail.com
              </a>{" "}
              with your request. We will respond within a reasonable time, and
              no later than 30 days.
            </p>
            {/* TODO: legal review. If you plan to accept users in the EU/UK, a formal GDPR/UK GDPR data subject access request process and Article 27 representative appointment will be required */}
          </section>

          {/* 6. Cookies & Tracking */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              6. Cookies and Tracking
            </h2>
            <p className="mt-3 leading-relaxed">
              KithNode uses PostHog for product analytics. PostHog may set
              cookies or use local storage in your browser to track anonymous
              session activity across page loads. No cookies are used for
              advertising. Vercel may also set performance and security cookies
              as part of its hosting infrastructure.
            </p>
            <p className="mt-3 leading-relaxed">
              You can disable cookies in your browser settings. Doing so will
              not affect your ability to submit the waitlist form, but may
              affect how analytics are recorded.
            </p>
          </section>

          {/* 7. Changes to Policy */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              7. Changes to This Policy
            </h2>
            <p className="mt-3 leading-relaxed">
              We may update this Privacy Policy from time to time. When we do,
              we will update the "Last updated" date at the top of this page. If
              changes are material, we will notify you by email if you are on
              the waitlist at the time of the change. Continued use of the
              waitlist form after any changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Contact</h2>
            <p className="mt-3 leading-relaxed">
              Questions about this Privacy Policy? Email{" "}
              <a
                href="mailto:samrigot31@gmail.com"
                className="text-[#0EA5E9] hover:underline"
              >
                samrigot31@gmail.com
              </a>
              .
            </p>
            {/* TODO: legal review. If you incorporate KithNode as an entity, replace the personal email with an official contact address and add the legal entity name and mailing address here */}
          </section>
        </div>
      </div>
    </main>
  );
}
