import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "たこやき · Takoyaki",
  description:
    "Takoyaki turns GitHub activity into real-time Discord pings, contribution stats, streak heatmaps, and leaderboards.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#981b18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Klee+One:wght@400;600&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <div className="ambient-bg" aria-hidden="true" />
        <SmoothScroll />
        <Nav />
        {children}
      </body>
    </html>
  );
}
