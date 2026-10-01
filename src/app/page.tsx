import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, patients, prescriptions } from "@/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getDb();
  const rows = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      drugName: prescriptions.drugName,
      strength: prescriptions.strength,
    })
    .from(patients)
    .leftJoin(prescriptions, eq(prescriptions.patientId, patients.id))
    .orderBy(patients.lastName);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Patients with active oncology Rx</h1>
      {rows.length === 0 && (
        <p className="text-sm text-zinc-600">No patients yet – run <code>npm run db:seed</code>.</p>
      )}
      <table className="w-full text-left text-sm">
        <thead className="border-b text-zinc-500">
          <tr>
            <th className="py-2">Patient</th>
            <th>DOB</th>
            <th>Active Rx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b hover:bg-zinc-50">
              <td className="py-2">
                <Link href={`/patients/${r.id}`} className="text-blue-700 hover:underline">
                  {r.lastName}, {r.firstName}
                </Link>
              </td>
              <td>{r.dob}</td>
              <td>
                {r.drugName} {r.strength}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
