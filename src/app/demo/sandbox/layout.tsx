import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SandboxSidebar } from "./_components/sandbox-sidebar";
import { SandboxTopBar } from "./_components/sandbox-top-bar";

export const metadata = {
  title: "Sandbox — KithNode",
  description:
    "Click around the KithNode dashboard with seeded anonymized data. Sign up to unlock your real warm-path network.",
};

export default function SandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Sticky demo banner */}
      <div className="sticky top-0 z-[60] border-b border-primary/40 bg-primary/10 py-2 text-center text-[12px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm">
        <span className="px-2">
          You&apos;re in the demo sandbox. Sign up for free to unlock your real
          warm-path network.
        </span>
        <Link
          href="/waitlist?from=demo"
          className="ml-2 inline-flex items-center gap-1 border border-primary/40 bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80"
        >
          <Sparkles size={10} />
          Get Access →
        </Link>
      </div>

      <div className="flex flex-1">
        <SandboxSidebar />
        <div className="flex flex-1 flex-col overflow-hidden pt-[49px] lg:pt-0">
          <SandboxTopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
