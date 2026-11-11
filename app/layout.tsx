import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpringDrill — CBT, Results & Report Cards for Nigerian Schools",
  description: "SpringDrill helps Nigerian schools set CBT tests, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice.",
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
      </head>
      <body>{children}</body>
    </html>
  );
}
