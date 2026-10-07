import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date("2026-10-07"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...products.map((p) => ({
      url: `${SITE_URL}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
