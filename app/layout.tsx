import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted fonts for the landing pages only: the variables are defined
// on <body> and consumed by the landing pages' own CSS. The static portal
// pages in public/ never load this layout, so their fonts are untouched,
// and globals.css is unchanged. Files live in app/fonts/ (see the README
// there for sources and licences).
// ChunkFive (The League of Moveable Type, OFL 1.1) — display headings.
// Metropolis (Chris Simpson, Unlicense) — body and UI text.
const chunkFive = localFont({
  src: "./fonts/ChunkFive-Regular.otf",
  variable: "--font-chunkfive",
  display: "swap",
});

const metropolis = localFont({
  src: [
    { path: "./fonts/Metropolis-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Metropolis-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Metropolis-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Metropolis-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Metropolis-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-metropolis",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://springdrill-portal.vercel.app"),
  title: "SpringDrill — CBT, Results & Report Cards for Nigerian Schools",
  description: "SpringDrill helps Nigerian schools set CBT tests, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice.",
  keywords: ["CBT", "computer-based testing", "report cards", "school results", "JAMB practice", "Nigerian schools", "lesson plans"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "SpringDrill — CBT, Results & Report Cards for Nigerian Schools",
    description: "SpringDrill helps Nigerian schools set CBT tests, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice.",
    url: "https://springdrill-portal.vercel.app",
    siteName: "SpringDrill",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Teacher guiding students at computers in a Nigerian classroom" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpringDrill — CBT, Results & Report Cards for Nigerian Schools",
    description: "SpringDrill helps Nigerian schools set CBT tests, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice.",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#007a4d",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SpringDrill",
  url: "https://springdrill-portal.vercel.app",
  logo: "https://springdrill-portal.vercel.app/springdrill-logo.png",
  description: "SpringDrill helps Nigerian schools set CBT tests, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+234-816-233-7303",
    email: "adielasam2015@gmail.com",
    contactType: "customer service",
    areaServed: "NG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preloader first frame: the logo assets are preloaded so the
            spinning emblem + steady wordmark render in the very first
            frame instead of popping in after the orbit/progress bar. */}
        <link rel="preload" as="image" href="/springdrill-emblem.png" fetchPriority="high" />
        <link rel="preload" as="image" href="/springdrill-wordmark.png" fetchPriority="high" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${chunkFive.variable} ${metropolis.variable}`}>{children}</body>
    </html>
  );
}
