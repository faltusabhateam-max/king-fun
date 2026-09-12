"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { shortAddr } from "@/lib/format";

export function WalletButton({ className = "" }: { className?: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  return (
    <button
      type="button"
      onClick={() => open()}
      className={`king-btn-primary whitespace-nowrap ${className}`}
    >
      {isConnected && address ? shortAddr(address, 4) : "Connect Wallet"}
    </button>
  );
}
