import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { charts, claims, getDb, patients, prescriptions } from "@/db";
import { ReviewButton } from "@/components/ReviewDialog";

export const dynamic = "force-dynamic";

export default async function PatientPage(props: PageProps<"/patients/[id]">) {
  const { id } = await props.params;
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();

  const db = getDb();
  const [patient] = await db.select().from(patients).where(eq(patients.id, pid));
  if (!patient) notFound();
  const rxs = await db.select().from(prescriptions).where(eq(prescriptions.patientId, pid));
  const history = await db
    .select()
    .from(claims)
    .where(eq(claims.patientId, pid))
    .orderBy(desc(claims.fillDate));
  const chartRows = await db
    .select({ id: charts.id, filename: charts.filename })
    .from(charts)
    .where(eq(charts.patientId, pid));

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-blue-700 hover:underline">
        ← All patients
      </Link>

      <section className="rounded-lg border p-4">
        <h1 className="text-xl font-semibold">
          {patient.lastName}, {patient.firstName}
        </h1>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-zinc-500">DOB</dt><dd>{patient.dob}</dd></div>
          <div><dt className="text-zinc-500">Phone</dt><dd>{patient.phone}</dd></div>
          <div className="col-span-2">
            <dt className="text-zinc-500">Address</dt>
            <dd>{patient.address}, {patient.city}, {patient.state} {patient.zip}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Active oncology prescription</h2>
        {rxs.map((rx) => (
          <div key={rx.id} id={`rx-${rx.id}`} className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="text-sm">
              <div className="font-medium">{rx.drugName} {rx.strength}</div>
              <div>{rx.directions}</div>
              <div className="text-zinc-600">
                Qty {rx.quantity} / {rx.daysSupply} DS · Dx: {rx.diagnosis} · {rx.prescriber} · Started {rx.startDate}
              </div>
              <div className="mt-1 text-xs uppercase text-green-700">{rx.status}</div>
            </div>
            <ReviewButton prescriptionId={rx.id} />
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Recent paid claims</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b text-zinc-500">
            <tr><th className="py-1">Fill date</th><th>Drug</th><th>Directions</th><th>Qty</th><th>DS</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.map((c) => (
              <tr key={c.id} id={`claim-${c.id}`} className="border-b">
                <td className="py-1">{c.fillDate}</td>
                <td>{c.drugName} {c.strength}</td>
                <td>{c.directions}</td>
                <td>{c.quantity}</td>
                <td>{c.daysSupply}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Submitted chart</h2>
        {chartRows.map((c) => (
          <div key={c.id}>
            <a href={`/api/charts/${c.id}`} target="_blank" className="text-sm text-blue-700 hover:underline">
              {c.filename}
            </a>
            <iframe src={`/api/charts/${c.id}`} className="mt-2 h-[520px] w-full rounded border" title="Chart PDF" />
          </div>
        ))}
      </section>
    </div>
  );
}
