import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { charts, claims, getDb, patients, prescriptions } from "@/db";
import { getRule, runReview } from "@/rules/registry";

export async function POST(req: Request) {
  const { prescriptionId } = await req.json();
  if (!Number.isInteger(prescriptionId)) {
    return NextResponse.json({ error: "prescriptionId required" }, { status: 400 });
  }

  const db = getDb();
  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId));
  if (!rx) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

  const rule = getRule(rx.drugName);
  if (!rule) {
    return NextResponse.json(
      { error: `No regimen rules configured for ${rx.drugName} yet.` },
      { status: 422 },
    );
  }

  const [patient] = await db.select().from(patients).where(eq(patients.id, rx.patientId));
  const patientClaims = await db.select().from(claims).where(eq(claims.patientId, rx.patientId));
  const [chart] = await db
    .select()
    .from(charts)
    .where(eq(charts.patientId, rx.patientId))
    .orderBy(desc(charts.uploadedAt))
    .limit(1);

  let pages: string[] = [];
  if (chart) {
    const { text } = await extractText(new Uint8Array(chart.pdf), { mergePages: false });
    pages = text;
  }
  const chartText = pages.join("\n");

  const result = runReview(rule, {
    patient,
    rx,
    claims: patientClaims,
    chartText,
    today: new Date(),
  });
  // Tag chart evidence with the page it was found on so the UI can jump there.
  for (const item of result.items) {
    for (const ev of item.evidence ?? []) {
      if (ev.source !== "Chart") continue;
      const idx = pages.findIndex((p) => p.includes(ev.text));
      ev.page = idx === -1 ? 1 : idx + 1;
    }
  }
  return NextResponse.json({ ...result, chartFound: Boolean(chart), chartId: chart?.id ?? null });
}
