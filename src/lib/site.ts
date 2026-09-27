// Canonical origin of the deployment — used for OG image URLs, JSON-LD,
// sitemap.xml and robots.txt. Set NEXT_PUBLIC_SITE_URL in production; the
// localhost default keeps local dev links absolute and valid.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
