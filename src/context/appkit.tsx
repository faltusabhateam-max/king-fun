"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { robinhoodChain } from "@/lib/robinhood-network";
import type { AppKitNetwork } from "@reown/appkit/networks";
import type { ReactNode } from "react";

const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "";

const metadata = {
  name: "king.fun",
  description:
    "KING.FUN — NFT launchpad on Robinhood Chain. Launch collections, mint, earn creator + platform fees.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://king.fun",
  icons: ["/logo.png"],
};

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [robinhoodChain];

const ethersAdapter = new EthersAdapter();

if (projectId) {
  createAppKit({
    adapters: [ethersAdapter],
    networks,
    defaultNetwork: robinhoodChain,
    metadata,
    projectId,
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#00e88f",
      "--w3m-color-mix": "#001a10",
      "--w3m-color-mix-strength": 40,
      "--w3m-border-radius-master": "16px",
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  });
}

export function AppKitProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
