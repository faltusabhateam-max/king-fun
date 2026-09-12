"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { TokenChart } from "@/components/TokenChart";
import { TradePanel } from "@/components/TradePanel";
import { formatPct, formatSol, formatUsd, shortAddr } from "@/lib/format";
import type { LaunchRecord, TradeRecord } from "@/lib/types";
import { ExternalLink } from "lucide-react";
import { spotPriceSol } from "@/lib/king-curve";

export default function TokenPage() {
  const params = useParams();
  const mint = String(params.mint || "");

  const [launch, setLaunch] = useState<LaunchRecord | null>(null);
  const [pair, setPair] = useState<{
    priceUsd?: number;
    liquidityUsd?: number;
    volume24h?: number;
    priceChange24h?: number;
    url?: string;
    dexId?: string;
  } | null>(null);
  const [candles, setCandles] = useState<number[][]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [mode, setMode] = useState<"jupiter" | "curve">("curve");

  const refresh = useCallback(async () => {
    if (!mint) return;
    const [lRes, cRes, tRes, dRes] = await Promise.all([
      fetch("/api/launches").then((r) => r.json()),
      fetch(`/api/chart?mint=${mint}`).then((r) => r.json()),
      fetch(`/api/trades?mint=${mint}`).then((r) => r.json()),
      fetch(`/api/dexscreener?q=${mint}`).then((r) => r.json()),
    ]);

    const found = (lRes.launches || []).find(
      (l: LaunchRecord) => l.mint === mint || l.id === mint
    );
    setLaunch(found || null);
    setCandles(cRes.candles || []);
    setTrades(tRes.trades || []);

    const dex = (dRes.tokens || []).find(
      (t: { address: string; source: string }) =>
        t.address === mint && t.source === "dexscreener"
    );
    if (dex) {
      setPair({
        priceUsd: dex.priceUsd,
        liquidityUsd: dex.liquidityUsd,
        volume24h: dex.volume24h,
        priceChange24h: dex.priceChange24h,
        url: dex.url,
        dexId: dex.dexId,
      });
      setMode("jupiter");
    } else if (found) {
      setMode("curve");
      setPair({
        priceUsd: spotPriceSol(found) * 150,
        liquidityUsd: found.realSolReserves * 150,
      });
    } else {
      setMode("jupiter");
    }

    if (cRes.pair) {
      setPair((p) => ({
        ...p,
        priceUsd: cRes.pair.priceUsd
          ? Number(cRes.pair.priceUsd)
          : p?.priceUsd,
        liquidityUsd: cRes.pair.liquidity?.usd ?? p?.liquidityUsd,
        volume24h: cRes.pair.volume?.h24 ?? p?.volume24h,
        priceChange24h: cRes.pair.priceChange?.h24 ?? p?.priceChange24h,
        url: cRes.pair.url ?? p?.url,
        dexId: cRes.pair.dexId ?? p?.dexId,
      }));
      if (cRes.pair.priceUsd) setMode("jupiter");
    }
  }, [mint]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 45_000);
    return () => clearInterval(id);
  }, [refresh]);

  const name = launch?.name || pair?.dexId || shortAddr(mint);
  const symbol = launch?.symbol || "TOKEN";
  const image = launch?.image || "/logo.png";
  const change = pair?.priceChange24h;

  return (
    <PageTransition>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-emerald-400/30 shadow-[0_0_24px_rgba(0,232,143,0.25)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">
            {name}{" "}
            <span className="text-[#e8eee9]/45">${symbol}</span>
          </h1>
          <p className="mt-1 font-mono text-xs text-[#e8eee9]/40">
            {shortAddr(mint, 8)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {launch && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#00e88f]">
                {launch.status === "curve" ? "King Curve" : launch.status}
              </span>
            )}
            {launch && (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#e8eee9]/60">
                Creator fee {(launch.creatorFeeBps / 100).toFixed(2)}%
              </span>
            )}
            {pair?.url && (
              <a
                href={pair.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#e8eee9]/60 hover:text-[#00e88f]"
              >
                DexScreener <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#e8eee9]">
            {formatUsd(pair?.priceUsd)}
          </div>
          <div
            className={`text-sm font-semibold ${
              (change ?? 0) >= 0 ? "text-[#00e88f]" : "text-rose-400"
            }`}
          >
            {formatPct(change)}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Liquidity", value: formatUsd(pair?.liquidityUsd) },
          { label: "Volume 24h", value: formatUsd(pair?.volume24h) },
          {
            label: "Curve SOL",
            value: launch ? formatSol(launch.realSolReserves) : "—",
          },
        ].map((s) => (
          <div key={s.label} className="king-panel p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#e8eee9]/40">
              {s.label}
            </div>
            <div className="mt-1 text-sm font-semibold sm:text-base">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="king-panel p-3 lg:col-span-2 sm:p-4">
          <TokenChart candles={candles} />
        </div>
        <TradePanel
          mint={mint}
          symbol={symbol}
          mode={mode}
          creatorFeeBps={launch?.creatorFeeBps}
          onTraded={refresh}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Trade feed</h2>
        {trades.length === 0 ? (
          <div className="king-panel p-6 text-center text-sm text-[#e8eee9]/45">
            No local curve trades yet.
          </div>
        ) : (
          <div className="king-panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-400/15 text-[#e8eee9]/45">
                <tr>
                  <th className="p-3">Side</th>
                  <th className="p-3">SOL</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Trader</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 30).map((t) => (
                  <tr key={t.id} className="border-b border-emerald-400/5">
                    <td
                      className={`p-3 capitalize ${
                        t.side === "buy" ? "text-[#00e88f]" : "text-rose-400"
                      }`}
                    >
                      {t.side}
                    </td>
                    <td className="p-3">{formatSol(t.solAmount)}</td>
                    <td className="p-3">{t.tokenAmount.toFixed(2)}</td>
                    <td className="p-3">{formatSol(t.creatorFeeSol)}</td>
                    <td className="p-3 font-mono text-xs">
                      {shortAddr(t.trader)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
