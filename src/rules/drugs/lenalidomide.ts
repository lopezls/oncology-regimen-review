import { ANTICOAGULANTS, ANTIPLATELETS, ANTITHROMBOTICS, STEROIDS } from "../drugClasses";
import {
  activeClaims,
  ageOn,
  chartEvidence,
  chartMatch,
  chartMentions,
  claimEvidence,
  compact,
  daysBetween,
  findClaims,
  fmtDate,
  parseDate,
  parseMg,
  rxEvidence,
} from "../helpers";
import type { RegimenRule } from "../types";

/**
 * Illustrative multiple-myeloma lenalidomide regimen rules (MVP).
 * Thresholds are simplified from labeling and MUST be validated by a
 * pharmacist/clinical team before any real-world use.
 *
 * Every result carries `evidence`: the exact claim / chart line / Rx the rule
 * relied on, so the reviewing pharmacist can verify it visually.
 */

/** Recommended starting daily dose (mg) by CrCl, per simplified MM labeling. */
function expectedLenalidomideDose(crcl: number): { mg: number; note: string } {
  if (crcl >= 60) return { mg: 25, note: "CrCl ≥60: 25 mg daily d1–21 of 28" };
  if (crcl >= 30) return { mg: 10, note: "CrCl 30–59: 10 mg daily" };
  return { mg: 15, note: "CrCl <30 (non-dialysis): 15 mg every 48 h" };
}

export const lenalidomide: RegimenRule = {
  drug: "lenalidomide",
  title: "Lenalidomide – Multiple Myeloma regimen",
  checks: [
    {
      id: "diagnosis",
      label: "Multiple myeloma diagnosis documented in chart",
      run: (ctx) => {
        const ev = chartEvidence(ctx, /multiple myeloma|\bC90\.0\d?\b/i);
        return ev
          ? { status: "pass", detail: "Diagnosis found in chart.", evidence: [ev] }
          : {
              status: "fail",
              detail: "No multiple myeloma diagnosis / ICD-10 C90.0x found in chart.",
              evidence: [{ source: "Rx", text: `Rx diagnosis: ${ctx.rx.diagnosis}` }],
            };
      },
    },
    {
      id: "steroid",
      label: "Dexamethasone (steroid backbone) on profile",
      run: (ctx) => {
        const active = activeClaims(ctx, STEROIDS, 14);
        if (active.length)
          return {
            status: "pass",
            detail: `${active[0].drugName} ${active[0].strength} is active on the claims profile.`,
            evidence: active.map(claimEvidence),
          };
        const old = findClaims(ctx, STEROIDS)[0];
        if (old)
          return {
            status: "warn",
            detail: `Last steroid claim ${fmtDate(old.fillDate)} (${old.daysSupply} DS) has lapsed.`,
            evidence: [claimEvidence(old)],
          };
        const mention = chartMentions(ctx, STEROIDS);
        const ev = mention ? chartEvidence(ctx, new RegExp(mention, "i")) : null;
        return {
          status: "fail",
          detail: mention
            ? `No paid steroid claim; chart mentions ${mention} but it has not been filled.`
            : "No dexamethasone claim and no mention in chart.",
          evidence: compact([ev]),
        };
      },
    },
    {
      id: "steroid-dose",
      label: "Dexamethasone dose appropriate (40 mg weekly; 20 mg if ≥75 y)",
      run: (ctx) => {
        const c = findClaims(ctx, ["dexamethasone"])[0];
        if (!c) return { status: "unknown", detail: "No dexamethasone claim to assess." };
        const weekly = parseMg(c.directions) ?? parseMg(c.strength);
        if (weekly == null)
          return {
            status: "unknown",
            detail: "Could not parse dexamethasone dose.",
            evidence: [claimEvidence(c)],
          };
        const age = ageOn(ctx.patient.dob, ctx.today);
        const expected = age >= 75 ? 20 : 40;
        const label = weekly < expected ? "LOW" : weekly > expected ? "HIGH" : "normal";
        return {
          status: weekly === expected ? "pass" : "warn",
          detail: `${weekly} mg/week is ${label} (expected ${expected} mg/week, age ${age}, DOB ${ctx.patient.dob}).`,
          evidence: [claimEvidence(c)],
        };
      },
    },
    {
      id: "vte",
      label: "VTE prophylaxis (aspirin or anticoagulant)",
      run: (ctx) => {
        const active = activeClaims(ctx, ANTITHROMBOTICS, 14);
        if (active.length) {
          const c = active[0];
          const kind = ANTICOAGULANTS.some((a) => c.drugName.toLowerCase().includes(a))
            ? "anticoagulant"
            : "antiplatelet";
          return {
            status: "pass",
            detail: `${c.drugName} ${c.strength} (${kind}) is active on the claims profile.`,
            evidence: active.map(claimEvidence),
          };
        }
        const mention = chartMentions(ctx, [...ANTIPLATELETS, ...ANTICOAGULANTS]);
        if (mention)
          return {
            status: "warn",
            detail: `Chart lists ${mention} but no paid claim (may be OTC) – confirm with patient.`,
            evidence: compact([chartEvidence(ctx, new RegExp(mention, "i"))]),
          };
        return {
          status: "fail",
          detail: "No aspirin/anticoagulant claim and none documented in chart.",
        };
      },
    },
    {
      id: "dose",
      label: "Lenalidomide dose appropriate for renal function",
      run: (ctx) => {
        const re = /CrCl[^0-9]{0,40}(\d+(?:\.\d+)?)/i;
        const crclStr = chartMatch(ctx, re);
        const mg = parseMg(ctx.rx.strength);
        if (crclStr == null)
          return {
            status: "unknown",
            detail: "No CrCl documented in chart – cannot verify renal dosing.",
            evidence: [rxEvidence(ctx)],
          };
        const evidence = compact([rxEvidence(ctx), chartEvidence(ctx, re)]);
        if (mg == null)
          return { status: "unknown", detail: "Could not parse prescribed strength.", evidence };
        const crcl = Number(crclStr);
        const exp = expectedLenalidomideDose(crcl);
        if (mg === exp.mg)
          return {
            status: "pass",
            detail: `${mg} mg matches expected for CrCl ${crcl} (${exp.note}).`,
            evidence,
          };
        const label = mg < exp.mg ? "LOW" : "HIGH";
        return {
          status: mg > exp.mg ? "fail" : "warn",
          detail: `${mg} mg is ${label} for CrCl ${crcl} mL/min (${exp.note}).`,
          evidence,
        };
      },
    },
    {
      id: "labs",
      label: "Baseline CBC (ANC & platelets) in chart",
      run: (ctx) => {
        const ancRe = /ANC[^0-9]{0,20}(\d[\d,.]*)/i;
        const pltRe = /platelets?[^0-9]{0,20}(\d[\d,.]*)/i;
        const anc = chartMatch(ctx, ancRe);
        const plt = chartMatch(ctx, pltRe);
        const evidence = compact([chartEvidence(ctx, ancRe), chartEvidence(ctx, pltRe)]);
        if (anc && plt) return { status: "pass", detail: `ANC ${anc}, platelets ${plt}.`, evidence };
        const missing = [!anc && "ANC", !plt && "platelets"].filter(Boolean).join(" & ");
        return { status: "fail", detail: `Chart missing ${missing}.`, evidence };
      },
    },
    {
      id: "rems",
      label: "REMS enrollment documented",
      run: (ctx) => {
        const ev = chartEvidence(ctx, /REMS/i);
        return ev
          ? { status: "pass", detail: "REMS documentation found in chart.", evidence: [ev] }
          : { status: "fail", detail: "No REMS enrollment / authorization found in chart." };
      },
    },
    {
      id: "refill",
      label: "Lenalidomide refill timing consistent",
      run: (ctx) => {
        const last = findClaims(ctx, ["lenalidomide"])[0];
        if (!last)
          return { status: "warn", detail: "No prior lenalidomide claim (new start?)." };
        const gap = daysBetween(parseDate(last.fillDate), ctx.today) - last.daysSupply;
        return gap > 7
          ? {
              status: "warn",
              detail: `Last fill ${fmtDate(last.fillDate)} (${last.daysSupply} DS) – ${gap} days overdue.`,
              evidence: [claimEvidence(last)],
            }
          : {
              status: "pass",
              detail: `Last fill ${fmtDate(last.fillDate)} (${last.daysSupply} DS) – on schedule.`,
              evidence: [claimEvidence(last)],
            };
      },
    },
  ],
};
