import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://king.fun";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "king.fun — NFT Launchpad on Robinhood Chain",
    template: "%s | king.fun",
  },
  description:
    "Launch PFP NFT collections on Robinhood Chain. Wallet-sign only. Create fee to treasury; mint fees split with creators.",
  applicationName: "king.fun",
  keywords: [
    "king.fun",
    "Robinhood Chain",
    "NFT launchpad",
    "PFP",
    "ERC721",
    "mint",
  ],
  authors: [{ name: "king.fun" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "king.fun — NFT Launchpad",
    description:
      "Paper-cut NFT launchpad on Robinhood Chain. Launch PFPs. Mint with ETH.",
    siteName: "king.fun",
    images: [{ url: "/og-banner.png", width: 1200, height: 630, alt: "king.fun" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "king.fun — NFT Launchpad",
    description: "Launch PFP collections on Robinhood Chain.",
    images: ["/og-banner.png"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1a1714",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
