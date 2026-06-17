import { CREDIT_COSTS, type CreditAction } from "@/lib/credit-costs";

/**
 * Small amber badge that shows what an action costs in credits, so a user
 * always sees where their credits go before clicking. Reads the number from
 * CREDIT_COSTS (single source of truth) given the action. `per` appends a unit
 * ("each" for the per-contact enrich charge).
 */
export function CreditCost({
  action,
  per,
  className = "",
}: {
  action: CreditAction;
  per?: string;
  className?: string;
}) {
  const n = CREDIT_COSTS[action];
  return (
    <span
      title={`Costs ${n} credit${n === 1 ? "" : "s"}${per ? ` per ${per}` : ""}`}
      className={`inline-flex items-center font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400/80 ${className}`}
    >
      {n} cr{per ? `/${per}` : ""}
    </span>
  );
}
