import { eq } from "drizzle-orm";
import { charts, getDb } from "@/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/charts/[id]">) {
  const { id } = await ctx.params;
  const [chart] = await getDb().select().from(charts).where(eq(charts.id, Number(id)));
  if (!chart) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(chart.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${chart.filename}"`,
    },
  });
}
