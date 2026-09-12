import Link from "next/link";
import type { CollectionRecord } from "@/lib/types";
import { shortAddr } from "@/lib/format";

export function CollectionCard({ c }: { c: CollectionRecord }) {
  const cover = c.pfps?.[0] || c.image || "/logo.png";
  const extra = Math.max(0, (c.pfps?.length || 0) - 1);

  return (
    <Link href={`/collection/${c.address}`} className="paper-card group block overflow-hidden">
      <div className="relative aspect-[4/3] bg-[var(--paper-deep)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={c.name} className="h-full w-full object-cover" />
        {extra > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold text-[var(--paper)]">
            +{extra} PFPs
          </span>
        )}
        {c.stockPair && (
          <span className="absolute left-2 top-2 rounded-md border border-[var(--cut)] bg-[var(--paper)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
            {c.stockPair}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[var(--ink)] group-hover:text-[var(--accent)]">
          {c.name}{" "}
          <span className="text-[var(--accent)]">${c.symbol}</span>
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Supply {c.maxSupply} · {c.mintPriceEth} ETH · {shortAddr(c.creator)}
        </p>
        <div className="mt-3 flex gap-2 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
          <span className="paper-chip">Floor —</span>
          <span className="paper-chip">Vol —</span>
        </div>
      </div>
    </Link>
  );
}
