import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/server/audit";
import { exportContactsCsv, exportDealsCsv } from "@/server/crm";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

/** CSV export of the signed-in user's own organisation. Needs the CRM entitlement. */
export async function GET(req: NextRequest) {
  let c: Awaited<ReturnType<typeof crmContext>>;
  try {
    c = await crmContext();
  } catch {
    return NextResponse.json({ error: { code: "unauthorized", message: "Inicie sessão." } }, { status: 401 });
  }
  if (!c.allowed) return NextResponse.json({ error: { code: "plan_required", message: "O CRM faz parte do plano Agência." } }, { status: 403 });
  const type = req.nextUrl.searchParams.get("type") === "deals" ? "deals" : "contacts";
  const csv = type === "deals" ? await exportDealsCsv(c.ctx.orgId) : await exportContactsCsv(c.ctx.orgId);
  await audit(c.ctx.user.id, c.ctx.orgId, `${type}.exported`, type);
  return new NextResponse("﻿" + csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="praca-${type}.csv"` } });
}
