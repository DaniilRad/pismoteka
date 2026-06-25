import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";

// Atrament UI typography: sans-serif for UI, serif for article bodies.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const merriweather = Merriweather({
  variable: "--font-serif",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Pismotéka — komunita, ktorá píše",
    template: "%s — Pismotéka",
  },
  description:
    "Slovenská komunitná platforma pre kvalitné dlhé texty, názory a príbehy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sk"
      className={`${inter.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
