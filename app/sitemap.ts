import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://springdrill-portal.vercel.app",
      lastModified: new Date("2026-11-12"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
