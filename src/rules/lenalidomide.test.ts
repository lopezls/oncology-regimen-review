import { describe, expect, it } from "vitest";
import { extractText } from "unpdf";
import { buildChartLines, renderChartPdf } from "../../scripts/chartTemplate";
import { buildScenarios } from "../../scripts/seedData";
import { getRule, runReview } from "./registry";

const today = new Date("2026-10-01T12:00:00Z");

describe("lenalidomide regimen rules", () => {
  for (const s of buildScenarios(today)) {
    it(`${s.key}: ${s.description}`, () => {
      const rule = getRule(s.rx.drugName)!;
      const result = runReview(rule, {
        patient: s.patient,
        rx: s.rx,
        claims: s.claims,
        chartText: buildChartLines(s).join("\n"),
        today,
      });
      const actual = Object.fromEntries(result.items.map((i) => [i.id, i.status]));
      expect(actual).toEqual(s.expected);
    });
  }

  it("flags HIGH dose with renal context", () => {
    const s = buildScenarios(today).find((x) => x.key === "renal-high-dose")!;
    const result = runReview(getRule("lenalidomide")!, {
      patient: s.patient,
      rx: s.rx,
      claims: s.claims,
      chartText: buildChartLines(s).join("\n"),
      today,
    });
    expect(result.overall).toBe("incomplete");
    expect(result.items.find((i) => i.id === "dose")!.detail).toMatch(/HIGH.*CrCl 38/);
  });

  it("shows which antithrombotic was found and its source", async () => {
    const s = buildScenarios(today).find((x) => x.key === "renal-high-dose")!;
    const pdf = await renderChartPdf(buildChartLines(s));
    const { text } = await extractText(new Uint8Array(pdf), { mergePages: true });
    const result = runReview(getRule("lenalidomide")!, {
      patient: s.patient,
      rx: s.rx,
      claims: s.claims,
      chartText: text,
      today,
    });
    const vte = result.items.find((i) => i.id === "vte")!;
    expect(vte.evidence![0].source).toBe("Paid claim");
    expect(vte.evidence![0].text).toMatch(/Apixaban 2\.5 mg/);
    const dx = result.items.find((i) => i.id === "diagnosis")!;
    expect(dx.evidence![0]).toMatchObject({ source: "Chart" });
    expect(dx.evidence![0].text).toMatch(/Multiple myeloma/i);
    // every non-failing check should cite its evidence
    for (const i of result.items.filter((x) => x.status === "pass"))
      expect(i.evidence?.length, i.id).toBeGreaterThan(0);
  });

  it("generated chart PDF round-trips through text extraction", async () => {
    const s = buildScenarios(today)[0];
    const pdf = await renderChartPdf(buildChartLines(s));
    const { text } = await extractText(new Uint8Array(pdf), { mergePages: true });
    expect(text).toMatch(/Multiple myeloma/i);
    expect(text).toMatch(/CrCl[^0-9]*78/);
  });
});
