import Link from "next/link";
import UsagePage from "../../../usage/page";

export default function BillingUsageSettingsPage() {
  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border-soft px-5 py-3">
        <Link href="/dashboard/settings/billing" className="min-h-11 px-3 py-3 text-sm font-bold text-text-secondary">Plan & billing</Link>
        <Link href="/dashboard/settings/billing/usage" className="min-h-11 border-b-2 border-accent-teal px-3 py-3 text-sm font-bold text-primary">Detailed usage</Link>
      </div>
      <UsagePage />
    </div>
  );
}
