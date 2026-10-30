import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildOpenApi(), { headers: { "cache-control": "public, max-age=3600" } });
}
