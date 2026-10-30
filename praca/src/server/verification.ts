import { sql } from "@/db";

export const VERIFICATION_METHODS = ["licence_ami", "owner_document", "site_visit"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

/**
 * The "verified" badge is backed by a stored verification (who, how, when). Registering one sets `listings.verified`;
 * revoking the last active one clears it again unless the advertiser's agency is verified at source.
 */
export async function verifyListing(listingId: string, method: VerificationMethod, reference: string | null, by: string | null): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO listing_verifications (listing_id, method, reference, verified_by) VALUES (${listingId}, ${method}, ${reference}, ${by})`;
    await tx`UPDATE listings SET verified = true, updated_at = now() WHERE id = ${listingId}`;
  });
}

export async function revokeVerification(verificationId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [v] = await tx<{ listing_id: string }[]>`UPDATE listing_verifications SET revoked_at = now() WHERE id = ${verificationId} AND revoked_at IS NULL RETURNING listing_id`;
    if (!v) return;
    await tx`
      UPDATE listings l SET verified = coalesce((SELECT o.verified FROM organizations o WHERE o.id = l.agency_id), false), updated_at = now()
      WHERE l.id = ${v.listing_id} AND NOT EXISTS (SELECT 1 FROM listing_verifications x WHERE x.listing_id = l.id AND x.revoked_at IS NULL)`;
  });
}

export async function listVerifications(limit = 50) {
  return sql<{ id: string; reference: string; method: string; ref: string | null; at: string }[]>`
    SELECT v.id, p.reference, v.method, v.reference AS ref, v.verified_at::text AS at
    FROM listing_verifications v JOIN listings l ON l.id = v.listing_id JOIN properties p ON p.id = l.property_id
    WHERE v.revoked_at IS NULL ORDER BY v.verified_at DESC LIMIT ${limit}`;
}
