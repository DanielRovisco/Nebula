import { NextResponse, type NextRequest } from "next/server";
import { buildDossier } from "@/server/dossier";
import { checkQuota, effectivePlan, incrementUsage } from "@/server/entitlements";
import { renderDossierPdf } from "@/server/pdf/dossier-pdf";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Property dossier as PDF. Needs a signed-in user and counts against the plan's PDF-report quota. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: { code: "unauthorized", message: "Inicie sessão." } }, { status: 401 });
  const { ref } = await params;
  const data = await buildDossier(ref);
  if (!data) return NextResponse.json({ error: { code: "not_found", message: "Imóvel não encontrado." } }, { status: 404 });

  const plan = await effectivePlan(u.id);
  const scope = plan.source === "org" && plan.orgId ? { type: "org" as const, id: plan.orgId } : { type: "user" as const, id: u.id };
  const q = await checkQuota(u.id, "pdf_reports", { scope, plan: plan.plan });
  if (!q.allowed) return NextResponse.json({ error: { code: q.reason === "plan" ? "plan_required" : "quota_exceeded", message: "O seu plano não permite mais relatórios em PDF." } }, { status: q.reason === "plan" ? 403 : 429 });

  const pdf = await renderDossierPdf(data);
  await incrementUsage(scope.type, scope.id, "pdf_reports");
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="dossie-${data.reference.toLowerCase()}.pdf"`, "cache-control": "private, no-store" } });
}
