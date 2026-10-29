import type { MetadataRoute } from "next";
import { isProduction, siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isProduction
      ? [{ userAgent: "*", allow: "/", disallow: ["/api/", "/conta", "/entrar"] }]
      : [{ userAgent: "*", disallow: "/" }], // never index staging/demo environments
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
