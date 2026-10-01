export type CheckStatus = "pass" | "fail" | "warn" | "unknown";

export interface RuleContext {
  patient: { firstName: string; lastName: string; dob: string };
  rx: {
    drugName: string;
    strength: string;
    directions: string;
    quantity: number;
    daysSupply: number;
    diagnosis: string;
  };
  claims: {
    id?: number;
    drugName: string;
    strength: string;
    directions: string | null;
    fillDate: string; // YYYY-MM-DD
    daysSupply: number;
    quantity: number;
    status: string;
  }[];
  chartText: string;
  today: Date;
}

/** Where a piece of supporting information was pulled from. */
export interface Evidence {
  source: "Paid claim" | "Chart" | "Rx";
  text: string;
  /** Chart evidence: 1-based PDF page the text was found on */
  page?: number;
  /** Paid-claim evidence: claims table row id, for jump-to-row */
  claimId?: number;
}

export interface CheckResult {
  status: CheckStatus;
  detail: string;
  /** exact items the rule relied on, so the RPh can verify visually */
  evidence?: Evidence[];
}

export interface Check {
  id: string;
  label: string;
  run: (ctx: RuleContext) => CheckResult;
}

export interface RegimenRule {
  /** generic drug name this rule set applies to (lowercase) */
  drug: string;
  title: string;
  checks: Check[];
}

export interface ReviewItem extends CheckResult {
  id: string;
  label: string;
}

export interface ReviewResult {
  drug: string;
  title: string;
  overall: "complete" | "incomplete" | "complete_with_notes";
  items: ReviewItem[];
}
