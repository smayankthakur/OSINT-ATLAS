import type { MetadataRoute } from "next";
// Non-indexed until public launch. Flip to allow when legal pages are signed off.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
