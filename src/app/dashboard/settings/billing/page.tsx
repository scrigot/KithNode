import Link from "next/link";
import BillingPage from "../../billing/page";

export default function BillingSettingsPage() {
  return <div><div className="flex flex-wrap gap-2 border-b border-white/[0.08] px-5 py-3"><Link href="/dashboard/settings/billing" className="min-h-11 border-b-2 border-accent-teal px-3 py-3 text-sm font-bold text-accent-teal">Plan & billing</Link><Link href="/dashboard/settings/billing/usage" className="min-h-11 px-3 py-3 text-sm font-bold text-text-secondary">Detailed usage</Link></div><BillingPage /></div>;
}
