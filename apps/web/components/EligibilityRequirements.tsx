import { formatEligibilityRules, type EligibilityRules } from "@/lib/eligibility";

export function EligibilityRequirements({ eligibility }: { eligibility: EligibilityRules | null }) {
  const rules = formatEligibilityRules(eligibility);

  if (rules.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        To participate, you must confirm:
      </h2>
      <ul className="mt-3 space-y-2">
        {rules.map((line) => (
          <li key={line} className="flex items-start gap-2 text-slate-700">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        You won&apos;t need to share these details directly — you&apos;ll generate a private proof
        that confirms them without revealing the underlying data.
      </p>
    </section>
  );
}
