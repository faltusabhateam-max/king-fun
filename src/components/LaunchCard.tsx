"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPct, formatUsd } from "@/lib/format";
import type { ExploreToken } from "@/lib/types";

export function LaunchCard({ token }: { token: ExploreToken }) {
  const change = token.priceChange24h;
  const up = (change ?? 0) >= 0;

  return (
    <Link
      href={`/token/${token.address}`}
      className="king-panel king-glow-card block overflow-hidden p-4"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-emerald-400/25 bg-[#00140c]">
          {token.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.imageUrl}
              alt={token.symbol}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image src="/logo.png" alt="" fill className="object-cover opacity-70" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-[#e8eee9]">
              {token.name}
            </h3>
            <span
              className={`shrink-0 text-xs font-semibold ${
                up ? "text-[#00e88f]" : "text-rose-400"
              }`}
            >
              {formatPct(change)}
            </span>
          </div>
          <p className="text-sm text-[#e8eee9]/50">${token.symbol}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-[#e8eee9]/40">Price</div>
          <div className="font-medium text-[#e8eee9]">
            {formatUsd(token.priceUsd)}
          </div>
        </div>
        <div>
          <div className="text-[#e8eee9]/40">Liquidity</div>
          <div className="font-medium text-[#e8eee9]">
            {formatUsd(token.liquidityUsd)}
          </div>
        </div>
        <div>
          <div className="text-[#e8eee9]/40">Vol 24h</div>
          <div className="font-medium text-[#e8eee9]">
            {formatUsd(token.volume24h)}
          </div>
        </div>
      </div>
      {token.source === "local" && (
        <div className="mt-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00e88f]">
          King Curve
        </div>
      )}
    </Link>
  );
}
