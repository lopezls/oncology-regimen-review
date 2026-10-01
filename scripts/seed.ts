import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb, charts, claims, patients, prescriptions } from "../src/db";
import { buildChartLines, renderChartPdf } from "./chartTemplate";
import { buildScenarios } from "./seedData";

config({ path: ".env.local" });

async function main() {
  const db = getDb();
  await db.execute(
    sql`TRUNCATE charts, claims, prescriptions, patients RESTART IDENTITY CASCADE`,
  );

  for (const s of buildScenarios(new Date())) {
    const [pt] = await db.insert(patients).values(s.patient).returning();
    await db.insert(prescriptions).values({ ...s.rx, patientId: pt.id, status: "active" });
    await db.insert(claims).values(s.claims.map((c) => ({ ...c, patientId: pt.id })));
    const pdf = await renderChartPdf(buildChartLines(s));
    await db.insert(charts).values({
      patientId: pt.id,
      filename: `${s.patient.lastName}_${s.patient.firstName}_chart.pdf`,
      pdf,
    });
    console.log(`seeded ${s.patient.firstName} ${s.patient.lastName} (${s.key})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
