import type { MetadataRoute } from "next";
import { sql } from "@/db";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

const alt = (path: string) => ({ languages: { "pt-PT": siteUrl + path, en: `${siteUrl}/en${path}` } });

/** Static pages + every district/municipality search page + every active property. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics = ["", "/comprar", "/arrendar", "/mercado", "/planos", "/developers", "/calculadoras", "/projetos", "/blog", "/sobre", "/metodologia", "/termos", "/privacidade", "/cookies", "/contactos"];
  const out: MetadataRoute.Sitemap = statics.map((p) => ({ url: siteUrl + p, lastModified: now, alternates: alt(p), changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));

  try {
    const zones = await sql<{ d: string; m: string | null }[]>`
      SELECT d.slug AS d, NULL AS m FROM geo_districts d
      UNION ALL SELECT d.slug, m.slug FROM geo_municipalities m JOIN geo_districts d ON d.code = m.district_code
      WHERE EXISTS (SELECT 1 FROM properties p WHERE p.municipality_code = m.code)`;
    for (const base of ["/comprar", "/arrendar", "/mercado"])
      for (const z of zones) {
        const p = `${base}/${z.d}${z.m ? "/" + z.m : ""}`;
        out.push({ url: siteUrl + p, lastModified: now, alternates: alt(p), changeFrequency: "daily", priority: 0.5 });
      }
    const arts = await sql<{ slug: string }[]>`SELECT slug FROM articles WHERE locale = 'pt' AND deleted_at IS NULL AND published_at <= now()`;
    for (const a of arts) out.push({ url: `${siteUrl}/blog/${a.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
    const devs = await sql<{ slug: string }[]>`SELECT slug FROM new_developments`;
    for (const d of devs) out.push({ url: `${siteUrl}/projetos/${d.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.5 });
    const props = await sql<{ reference: string; updated_at: Date }[]>`
      SELECT p.reference, max(l.updated_at) AS updated_at FROM properties p JOIN listings l ON l.property_id = p.id
      WHERE l.status = 'active' AND l.is_primary AND p.deleted_at IS NULL GROUP BY p.reference ORDER BY max(l.updated_at) DESC LIMIT 45000`;
    for (const r of props) {
      const p = `/imovel/${r.reference.toLowerCase()}`;
      out.push({ url: siteUrl + p, lastModified: r.updated_at, alternates: alt(p), changeFrequency: "daily", priority: 0.7 });
    }
  } catch {
    /* DB unavailable: serve the static part */
  }
  return out;
}
