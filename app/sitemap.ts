import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://springdrill-portal.vercel.app",
      lastModified: new Date("2026-11-12"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://springdrill-portal.vercel.app/contact",
      lastModified: new Date("2026-11-12"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://springdrill-portal.vercel.app/tools/remove-background",
      lastModified: new Date("2026-11-13"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://springdrill-portal.vercel.app/jamb-practice",
      lastModified: new Date("2026-11-13"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
