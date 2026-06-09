import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms governing your use of KithNode during the pre-launch beta period.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: 2026-04-22</p>

        <div className="mt-10 space-y-10 text-slate-700">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3 leading-relaxed">
              By submitting the KithNode waitlist form or accessing any part of
              the KithNode service (the "Service"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree to these
              Terms, do not submit the form and do not use the Service.
            </p>
            {/* TODO: legal review. Once KithNode incorporates as a legal entity, replace "KithNode" throughout with the proper entity name and jurisdiction of incorporation */}
          </section>

          {/* 2. Pre-Launch Beta Notice */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              2. Pre-Launch Beta Notice
            </h2>
            <p className="mt-3 leading-relaxed">
              KithNode is currently in a pre-launch private alpha stage. The
              Service is provided on an "as-is" and "as-available" basis for
              testing and feedback purposes. Features, functionality, pricing,
              and terms are subject to change at any time without notice.
              KithNode makes no commitment that the Service will continue to be
              available, that any specific feature will be preserved, or that
              the waitlist form constitutes a contract for future service
              delivery.
            </p>
            <p className="mt-3 leading-relaxed">
              Joining the waitlist does not guarantee access to the Service.
              Invitations are issued at KithNode&apos;s sole discretion.
            </p>
          </section>

          {/* 3. Eligibility */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              3. Eligibility
            </h2>
            <p className="mt-3 leading-relaxed">
              You must be at least 13 years of age to submit the waitlist form.
              The Service is intended for currently enrolled college or
              university students. By submitting the form, you represent that
              the information you provide is accurate and truthful.
            </p>
          </section>

          {/* 4. User Conduct */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              4. User Conduct
            </h2>
            <p className="mt-3 leading-relaxed">You agree not to:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed">
              <li>
                Submit false, misleading, or impersonated information on the
                waitlist form.
              </li>
              <li>
                Use automated tools, bots, or scripts to submit the form or
                generate referral codes in bulk.
              </li>
              <li>
                Attempt to reverse engineer, scrape, or extract data from the
                Service or its underlying systems.
              </li>
              <li>
                Use the Service for any unlawful purpose or in violation of any
                applicable law or regulation.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service or its hosting infrastructure.
              </li>
            </ul>
          </section>

          {/* 5. User Content and Data */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              5. User Content and Data
            </h2>
            <p className="mt-3 leading-relaxed">
              By submitting the waitlist form, you grant KithNode a
              non-exclusive, royalty-free right to store and use the information
              you submit for the purposes described in the Privacy Policy. This
              includes using your free-text responses to inform product
              development.
            </p>
            <p className="mt-3 leading-relaxed">
              You retain ownership of any content you submit. KithNode will not
              publicly attribute your free-text responses to you without your
              consent.
            </p>
            <p className="mt-3 leading-relaxed">
              Refer to the{" "}
              <Link href="/privacy" className="text-[#0EA5E9] hover:underline">
                Privacy Policy
              </Link>{" "}
              for full details on how submitted data is stored, retained, and
              processed.
            </p>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              6. Intellectual Property
            </h2>
            <p className="mt-3 leading-relaxed">
              All content, design, code, and materials on the KithNode website
              and Service are the property of KithNode and its founder unless
              otherwise noted. You may not reproduce, distribute, or create
              derivative works from any part of the Service without prior
              written permission.
            </p>
          </section>

          {/* 7. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              7. Third-Party Services
            </h2>
            <p className="mt-3 leading-relaxed">
              The Service integrates with or references third-party platforms
              including LinkedIn. If you provide a LinkedIn URL, you represent
              that you own or have the right to share that profile URL. Use of
              LinkedIn and any other third-party platform is governed by their
              respective terms of service. KithNode is not affiliated with or
              endorsed by LinkedIn or any other third-party service referenced
              on this site.
            </p>
          </section>

          {/* 8. Disclaimer of Warranties */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              8. Disclaimer of Warranties
            </h2>
            <p className="mt-3 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT. KITHNODE DOES NOT WARRANT THAT THE
              SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR
              OTHER HARMFUL COMPONENTS.
            </p>
            <p className="mt-3 leading-relaxed">
              KithNode does not warrant or guarantee any particular recruiting
              outcome, job offer, interview, or networking result arising from
              use of the Service.
            </p>
          </section>

          {/* 9. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              9. Limitation of Liability
            </h2>
            <p className="mt-3 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
              SHALL KITHNODE OR ITS FOUNDER BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING
              OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE,
              EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3 leading-relaxed">
              IN NO EVENT SHALL KITHNODE&apos;S TOTAL LIABILITY TO YOU FOR ALL
              CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE EXCEED
              FIFTY DOLLARS ($50).
            </p>
            {/* TODO: legal review. The $50 liability cap is a placeholder. Adjust to reflect any fees paid or remove if no fees are ever charged at this stage */}
          </section>

          {/* 10. Indemnification */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              10. Indemnification
            </h2>
            <p className="mt-3 leading-relaxed">
              You agree to indemnify, defend, and hold harmless KithNode and its
              founder from and against any claims, liabilities, damages, losses,
              and expenses (including reasonable legal fees) arising out of or
              in any way connected with your access to or use of the Service,
              your violation of these Terms, or your submission of false or
              misleading information.
            </p>
          </section>

          {/* 11. Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              11. Governing Law
            </h2>
            <p className="mt-3 leading-relaxed">
              These Terms are governed by and construed in accordance with the
              laws of the State of North Carolina, without regard to its
              conflict-of-law provisions. Any dispute arising from these Terms
              or your use of the Service shall be resolved in the courts located
              in North Carolina, and you consent to personal jurisdiction in
              those courts.
            </p>
            {/* TODO: legal review. If you incorporate outside of North Carolina or prefer a different venue (e.g., federal court, arbitration), update this section accordingly */}
          </section>

          {/* 12. Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              12. Changes to Terms
            </h2>
            <p className="mt-3 leading-relaxed">
              We reserve the right to modify these Terms at any time. When we
              do, we will update the "Last updated" date at the top of this
              page. If you are on the waitlist at the time of a material change,
              we will attempt to notify you by email. Continued use of the
              Service after changes are posted constitutes your acceptance of
              the revised Terms.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              13. Contact
            </h2>
            <p className="mt-3 leading-relaxed">
              Questions about these Terms? Email{" "}
              <a
                href="mailto:samrigot31@gmail.com"
                className="text-[#0EA5E9] hover:underline"
              >
                samrigot31@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
