// Mirrors apps/api/src/utils/eligibility.ts's ATTRIBUTE_DEFS. Kept in
// sync by hand for now — once packages/shared exists, this (and the
// API's copy) should move there so there's a single source of truth.

const ATTRIBUTE_LABELS: Record<string, string> = {
  age: "Age",
  country: "Country",
  employmentStatus: "Employment status",
  educationLevel: "Education level",
};

const OPERATOR_LABELS: Record<string, string> = {
  GTE: "at least",
  LTE: "at most",
  EQ: "exactly",
};

interface EligibilityRule {
  operator: string;
  value?: string | number;
  min?: number;
  max?: number;
}

export type EligibilityRules = Record<string, EligibilityRule>;

/** Turns one {attribute: {operator, value}} pair into a plain-English line. */
function formatRule(attribute: string, rule: EligibilityRule): string {
  const label = ATTRIBUTE_LABELS[attribute] ?? attribute;

  if (rule.operator === "BETWEEN") {
    return `${label} between ${rule.min} and ${rule.max}`;
  }

  if (rule.operator === "EQ") {
    return `${label} is ${rule.value}`;
  }

  const opLabel = OPERATOR_LABELS[rule.operator] ?? rule.operator;
  return `${label} is ${opLabel} ${rule.value}`;
}

/** Formats a full eligibility object into an array of readable requirement lines. */
export function formatEligibilityRules(eligibility: EligibilityRules | null): string[] {
  if (!eligibility) {
    return [];
  }
  return Object.entries(eligibility).map(([attribute, rule]) => formatRule(attribute, rule));
}
