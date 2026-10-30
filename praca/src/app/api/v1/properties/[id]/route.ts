import type { NextResponse} from "next/server";
import { type NextRequest } from "next/server";
import { sql } from "@/db";
import { UUID_RE } from "@/lib/ids";
import { ApiError, authenticate, errorResponse, ok } from "@/server/api/auth";
import { getPropertyByReference } from "@/server/properties";

export const dynamic = "force-dynamic";

/** GET /api/v1/properties/{id} — id is a reference (PR-000123) or the property UUID. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const ctx = await authenticate(req);
    const { id } = await params;
    let ref = /^pr-\d{6}$/i.test(id) ? id : null;
    if (!ref && UUID_RE.test(id)) {
      const [r] = await sql<{ reference: string }[]>`SELECT reference FROM properties WHERE id = ${id} AND deleted_at IS NULL`;
      ref = r?.reference ?? null;
    }
    if (!ref) throw new ApiError(404, "not_found", "Imóvel não encontrado.");
    const p = await getPropertyByReference(ref);
    if (!p) throw new ApiError(404, "not_found", "Imóvel não encontrado.");
    return ok(
      {
        id: p.id,
        reference: p.reference,
        type: p.type,
        typology: p.typology,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        usableArea: p.usableArea,
        grossArea: p.grossArea,
        plotArea: p.plotArea,
        yearBuilt: p.yearBuilt,
        floor: p.floor,
        condition: p.condition,
        energyClass: p.energyClass,
        features: { parkingSpaces: p.parkingSpaces, elevator: p.elevator, balcony: p.balcony, terrace: p.terrace, pool: p.pool, garden: p.garden, view: p.view, furnished: p.furnished, petsAllowed: p.petsAllowed, tenanted: p.tenanted },
        location: { lat: p.lat, lng: p.lng, address: p.address, postalCode: p.postalCode, parish: p.geo.parish?.name ?? null, municipality: p.geo.municipality?.name ?? null, district: p.geo.district?.name ?? null },
        listing: { id: p.primary.id, business: p.primary.business, status: p.primary.status, price: p.primary.price, pricePerM2: p.primary.pricePerM2, priceDropPct: p.primary.dropPct, title: p.primary.title, description: p.primary.description, advertiserType: p.primary.advertiserType, advertiserName: p.primary.advertiserName, verified: p.primary.verified, publishedAt: p.primary.publishedAt },
        otherListings: p.others.map((o) => ({ id: o.id, price: o.price, advertiserName: o.advertiserName, source: o.sourceName, publishedAt: o.publishedAt })),
        priceHistory: p.priceHistory,
        media: p.media.map((m) => ({ url: m.url, illustrative: m.illustrative })),
        isDemo: p.isSeed,
      },
      undefined,
      ctx,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
