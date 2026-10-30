import { NextResponse, type NextRequest } from "next/server";
import { effectivePlan, getEntitlement, getUsage, incrementUsage } from "@/server/entitlements";
import { getSeries, resolveCodes } from "@/server/observatory";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

const csv = (v: string | number | null) => (v == null ? "" : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** CSV of the monthly series of up to four zones. Plan-gated (exports entitlement) and metered per month. */
export async function GET(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: { code: "unauthorized", message: "Inicie sessão." } }, { status: 401 });
  const { plan } = await effectivePlan(u.id);
  const ent = await getEntitlement(plan, "exports");
  if (!ent.enabled) return NextResponse.json({ error: { code: "plan_required", message: "A exportação CSV exige o plano Pro ou Agência." } }, { status: 403 });

  const zones = await resolveCodes((req.nextUrl.searchParams.get("z") ?? "").split(","));
  if (!zones.length) return NextResponse.json({ error: { code: "invalid_zone", message: "Indique pelo menos uma zona (?z=1106)." } }, { status: 400 });

  const rows: string[] = ["periodo,zona,codigo,negocio,preco_mediano_m2,p25,p75,amostra"];
  for (const z of zones) for (const biz of ["sale", "rent"] as const) for (const s of await getSeries(z.level, z.code, biz, 60)) rows.push([s.period, z.name, z.code, biz, s.ppm, s.p25, s.p75, s.n].map(csv).join(","));

  const used = await getUsage("user", u.id, "exports");
  if (ent.limit != null && used + rows.length - 1 > ent.limit) return NextResponse.json({ error: { code: "quota_exceeded", message: "Atingiu o limite mensal de exportações do seu plano." } }, { status: 429 });
  await incrementUsage("user", u.id, "exports", rows.length - 1);

  return new NextResponse("﻿" + rows.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="praca-mercado.csv"' } });
}
