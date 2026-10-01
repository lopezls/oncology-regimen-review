import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Scenario } from "./seedData";

/** Plain-text lines of the fake clinic note (also used directly in unit tests). */
export function buildChartLines(s: Scenario): string[] {
  const p = s.patient;
  const c = s.chart;
  const lines: string[] = [
    "ACME ONCOLOGY & HEMATOLOGY ASSOCIATES (FICTIONAL)",
    "Prior Authorization Clinical Note",
    "",
    `Patient: ${p.lastName}, ${p.firstName}    DOB: ${p.dob}`,
    `Address: ${p.address}, ${p.city}, ${p.state} ${p.zip}    Phone: ${p.phone}`,
    `Provider: ${s.rx.prescriber}`,
    "",
    "REASON FOR VISIT",
    `Requesting prior authorization for ${s.rx.drugName} ${s.rx.strength}.`,
    "",
  ];
  if (c.diagnosisLine) lines.push("DIAGNOSIS", `Diagnosis: ${c.diagnosisLine}`, "");
  lines.push("VITALS / LABS", `Weight: ${c.weightKg} kg`, `Serum creatinine: ${c.scr} mg/dL`);
  if (c.crcl != null) lines.push(`Estimated CrCl (Cockcroft-Gault): ${c.crcl} mL/min`);
  if (c.anc) lines.push(`ANC: ${c.anc}`);
  if (c.platelets) lines.push(`Platelets: ${c.platelets}`);
  lines.push("", "CURRENT MEDICATIONS", ...c.meds.map((m) => `- ${m}`), "");
  if (c.rems) lines.push("REMS", c.rems, "");
  lines.push("ASSESSMENT / PLAN", ...c.plan.map((x) => `- ${x}`), "", "Electronically signed: " + s.rx.prescriber);
  return lines;
}

export async function renderChartPdf(lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  let y = 750;
  lines.forEach((line, i) => {
    const isHeading = line === line.toUpperCase() && line.trim().length > 0 || i === 1;
    page.drawText(line, {
      x: 54,
      y,
      size: i === 0 ? 14 : 10.5,
      font: isHeading ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= i === 0 ? 24 : 16;
  });
  page.drawText("SYNTHETIC DATA - NOT A REAL PATIENT RECORD", {
    x: 54, y: 30, size: 8, font, color: rgb(0.6, 0.1, 0.1),
  });
  return Buffer.from(await doc.save());
}
