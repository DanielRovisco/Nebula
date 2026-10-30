import { NextResponse, type NextRequest } from "next/server";
import { checkQuota, effectivePlan, incrementUsage } from "@/server/entitlements";
import { renderValuationPdf } from "@/server/pdf/valuation-pdf";
import { currentUser } from "@/server/session";
import { getValuationForUser } from "@/server/valuation-data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: { code: "unauthorized", message: "Inicie sessão." } }, { status: 401 });
  const { id } = await params;
  const rec = await getValuationForUser(id, u.id);
  if (!rec) return NextResponse.json({ error: { code: "not_found", message: "Avaliação não encontrada." } }, { status: 404 });

  const plan = await effectivePlan(u.id);
  const scope = plan.source === "org" && plan.orgId ? { type: "org" as const, id: plan.orgId } : { type: "user" as const, id: u.id };
  const q = await checkQuota(u.id, "pdf_reports", { scope, plan: plan.plan });
  if (!q.allowed) return NextResponse.json({ error: { code: q.reason === "plan" ? "plan_required" : "quota_exceeded", message: "O seu plano não permite mais relatórios em PDF." } }, { status: q.reason === "plan" ? 403 : 429 });

  const pdf = await renderValuationPdf(rec);
  await incrementUsage(scope.type, scope.id, "pdf_reports");
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="avaliacao-${id.slice(0, 8)}.pdf"`, "cache-control": "private, no-store" } });
}
