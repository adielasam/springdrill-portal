import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
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
  logo: "https://springdrill-portal.vercel.app/icon.svg",
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
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
