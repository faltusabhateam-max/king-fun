"use client";

import Link from "next/link";
import { UNISWAP_V2_ROUTER } from "@/lib/uniswap";

export default function LeveragePage() {
  const vault = process.env.NEXT_PUBLIC_MARGIN_VAULT || "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-black">Leverage (real margin)</h1>
      <div className="kf-panel space-y-3 p-5 text-sm leading-relaxed">
        <p>
          50x is <strong>not</strong> faked in the browser. Leveraged longs need
          an on-chain margin vault with real ETH liquidity.
        </p>
        <p>
          Contract source: <code className="text-[var(--accent)]">contracts/KingMarginVault.sol</code>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>Lenders deposit ETH into the vault</li>
          <li>Traders open isolated MEME/ETH longs up to 50x</li>
          <li>Vault borrows pool ETH, swaps via Uniswap V2 Router, holds tokens</li>
          <li>Close / liquidate with real repayments</li>
        </ul>
        <p>
          Router wiring target:{" "}
          <code className="break-all text-xs">{UNISWAP_V2_ROUTER}</code>
        </p>
        {vault ? (
          <p className="text-[var(--accent)]">
            Vault configured: {vault}
          </p>
        ) : (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100">
            No <code>NEXT_PUBLIC_MARGIN_VAULT</code> set. Deploy{" "}
            <code>KingMarginVault</code> (constructor = V2 router), seed with{" "}
            <code>depositLender()</code>, then set the env and redeploy the app.
            Until then Trade runs <strong>spot 1x only</strong>.
          </p>
        )}
        <p>
          Compile: <code>npx hardhat compile</code>. Deploy with your wallet (no
          server keys). Private /deploy stays admin-gated for factory tooling.
        </p>
        <Link href="/" className="king-btn-primary inline-flex">
          Back to Spot Trade
        </Link>
      </div>
    </div>
  );
}
