import { lenalidomide } from "./drugs/lenalidomide";
import type { RegimenRule, ReviewResult, RuleContext } from "./types";

/** Add new drugs here: one rule file in ./drugs + one entry below. */
const RULES: Record<string, RegimenRule> = {
  lenalidomide,
};

export function getRule(drugName: string): RegimenRule | undefined {
  const key = drugName.toLowerCase();
  return Object.values(RULES).find((r) => key.includes(r.drug));
}

export function runReview(rule: RegimenRule, ctx: RuleContext): ReviewResult {
  const items = rule.checks.map((c) => ({ id: c.id, label: c.label, ...c.run(ctx) }));
  const overall = items.some((i) => i.status === "fail")
    ? "incomplete"
    : items.some((i) => i.status === "warn" || i.status === "unknown")
      ? "complete_with_notes"
      : "complete";
  return { drug: rule.drug, title: rule.title, overall, items };
}
