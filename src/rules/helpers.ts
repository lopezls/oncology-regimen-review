import type { Evidence, RuleContext } from "./types";

const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

export function ageOn(dob: string, today: Date): number {
  const b = parseDate(dob);
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const m = today.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** Paid claims whose drug name contains any alias, newest first. */
export function findClaims(ctx: RuleContext, aliases: string[]) {
  return ctx.claims
    .filter(
      (c) =>
        c.status === "paid" &&
        aliases.some((a) => c.drugName.toLowerCase().includes(a)),
    )
    .sort((a, b) => b.fillDate.localeCompare(a.fillDate));
}

/** Claims whose days' supply still covers today (plus a grace window). */
export function activeClaims(
  ctx: RuleContext,
  aliases: string[],
  graceDays = 7,
) {
  return findClaims(ctx, aliases).filter((c) => {
    const end = parseDate(c.fillDate).getTime() + c.daysSupply * DAY_MS;
    return ctx.today.getTime() - end <= graceDays * DAY_MS;
  });
}

/** First capture group (or whole match) of a regex against chart text. */
export function chartMatch(ctx: RuleContext, re: RegExp): string | null {
  const m = ctx.chartText.match(re);
  return m ? (m[1] ?? m[0]).trim() : null;
}

export function chartMentions(ctx: RuleContext, aliases: string[]): string | null {
  const text = ctx.chartText.toLowerCase();
  return aliases.find((a) => text.includes(a)) ?? null;
}

/** Pull a mg amount like "40 mg" out of free text. */
export function parseMg(text: string | null | undefined): number | null {
  const m = text?.match(/(\d+(?:\.\d+)?)\s*mg/i);
  return m ? Number(m[1]) : null;
}

type Claim = RuleContext["claims"][number];

export function claimEvidence(c: Claim): Evidence {
  const dir = c.directions ? ` · "${c.directions}"` : "";
  return {
    source: "Paid claim",
    claimId: c.id,
    text: `${c.drugName} ${c.strength} · filled ${fmtDate(c.fillDate)} · ${c.daysSupply} DS · qty ${c.quantity}${dir}`,
  };
}

/** The full chart line containing the first match of `re` (or a short snippet). */
export function chartEvidence(ctx: RuleContext, re: RegExp): Evidence | null {
  const m = re.exec(ctx.chartText);
  if (!m) return null;
  const lineStart = ctx.chartText.lastIndexOf("\n", m.index) + 1;
  let lineEnd = ctx.chartText.indexOf("\n", m.index);
  if (lineEnd === -1) lineEnd = ctx.chartText.length;
  let text = ctx.chartText.slice(lineStart, lineEnd).trim();
  if (text.length > 160) {
    const at = m.index - lineStart;
    text = text.slice(Math.max(0, at - 60), at + 100).trim();
  }
  return { source: "Chart", text };
}

export function rxEvidence(ctx: RuleContext): Evidence {
  const { drugName, strength, directions } = ctx.rx;
  return { source: "Rx", text: `${drugName} ${strength} · "${directions}"` };
}

export function compact<T>(items: (T | null | false | undefined)[]): T[] {
  return items.filter(Boolean) as T[];
}
