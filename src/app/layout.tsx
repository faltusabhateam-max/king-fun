import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { FloatingNav } from "@/components/FloatingNav";
import { Starfield } from "@/components/Starfield";

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
    "KING.FUN Launchpad — launch NFT collections on Robinhood Chain, mint with ETH, earn creator + platform fees. Deep space emerald.",
  applicationName: "king.fun",
  keywords: [
    "king.fun",
    "Robinhood Chain",
    "NFT launchpad",
    "ERC721",
    "mint",
    "WalletConnect",
  ],
  authors: [{ name: "king.fun" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "king.fun — NFT Launchpad on Robinhood Chain",
    description:
      "Launch NFT collections. Mint on Robinhood Chain. Earn creator fees. Premium emerald space launchpad.",
    siteName: "king.fun",
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: "king.fun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "king.fun — NFT Launchpad on Robinhood Chain",
    description:
      "Launch NFT collections. Mint on Robinhood Chain. Earn creator fees.",
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
  themeColor: "#000f0a",
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
          <Starfield />
          <FloatingNav />
          <main className="relative mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
