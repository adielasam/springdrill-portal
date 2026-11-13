import type { MetadataRoute } from "next";

// Web app manifest: makes SpringDrill installable (desktop icon on Windows,
// home-screen icon on phones). Served at /manifest.webmanifest. Icons are
// generated from the SpringDrill emblem (see public/icons/).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpringDrill",
    short_name: "SpringDrill",
    description:
      "CBT tests, results and report cards for Nigerian schools — plus free JAMB practice that works offline.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007a4d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
