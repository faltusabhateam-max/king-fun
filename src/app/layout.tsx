import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AlertWatcher } from "@/components/AlertWatcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://kingfun-live.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KINGFUN TRADING APP — Robinhood TOKEN/ETH",
    template: "%s | KINGFUN",
  },
  description:
    "Robinhood Chain meme coin trading terminal. Buy any meme with ETH / sell for ETH on Uniswap. Connect Wallet.",
  applicationName: "KINGFUN",
  keywords: [
    "KINGFUN",
    "Robinhood Chain",
    "meme trading",
    "Uniswap",
    "TOKEN/ETH",
  ],
  authors: [{ name: "KINGFUN" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "KINGFUN TRADING APP",
    description:
      "Robinhood Chain–only meme trading. Connect Wallet. Real TOKEN/ETH swaps.",
    siteName: "KINGFUN",
    images: [
      {
        url: "https://kingfun-live.vercel.app/og-banner.png",
        width: 1200,
        height: 630,
        alt: "KINGFUN TRADING APP",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KINGFUN TRADING APP",
    description: "Robinhood Chain TOKEN/ETH trading. Connect Wallet.",
    images: ["https://kingfun-live.vercel.app/og-banner.png"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#000b07",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <AlertWatcher />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="relative mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-5 sm:py-6">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
