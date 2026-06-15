import Link from "next/link";

export const metadata = {
  title: "Why KithNode exists",
  description: "The intro beats the resume. KithNode is the warm-path method, automated.",
};

export default function ManifestoPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-medium text-white/50 transition-colors hover:text-white">
          &larr; Back
        </Link>
        <h1 className="mt-8 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Why KithNode exists
        </h1>
        <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed text-white/80">
          <p>Cold outreach is a numbers game you usually lose. Out of every hundred-plus cold emails, almost no one replies. The students who actually get the meeting did not have better resumes. They had a warm path: someone two degrees away who made the intro.</p>
          <p>I'm Sam, a UNC freshman. I'm not in the business school yet, I don't have a target-school resume or a high GPA. But I'm interning at a Fortune 500 building enterprise-scale RAG systems, and at a PE firm building AI automations like deal sourcing, and I got the PE one through a friend in my pledge class who introduced me. Not a cold app. A warm path.</p>
          <p>KithNode is that method, automated. It finds the alumni who can actually introduce you, scores each path by signals you can verify, and drafts the message. You send it yourself. No automation, no bots, nothing that touches your LinkedIn account.</p>
          <p>The intro beats the resume. If it worked for me with none of the pedigree, it'll work for you.</p>
        </div>
        <Link href="/waitlist" className="mt-10 inline-flex items-center rounded-lg bg-[#0EA5E9] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#0284C7]">
          Request Access
        </Link>
      </div>
    </main>
  );
}
