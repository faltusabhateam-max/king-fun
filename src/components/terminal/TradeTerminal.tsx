"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { formatUnits } from "ethers";
import { LiveChart, type ChartCandle } from "./LiveChart";
import { swapBuyWithEth, swapSellForEth } from "@/lib/swap-client";
import { explorerTx } from "@/lib/robinhood";
import { shortAddr } from "@/lib/format";

type Market = {
  token: string;
  name: string;
  symbol: string;
  decimals: number;
  pool: string;
  kind: "v2" | "v3";
  fee?: number;
  priceEth: number;
  liquidityEth: number;
  reserveEth: string;
  reserveToken: string;
};

const TFS = ["1s", "1m", "5m", "15m", "1h", "4h", "1D"] as const;
const PRESETS = ["0.01", "0.05", "0.1", "0.25", "0.5", "1"] as const;

export function TradeTerminal({ initialCa = "" }: { initialCa?: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

  const [ca, setCa] = useState(initialCa);
  const [market, setMarket] = useState<Market | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tf, setTf] = useState<(typeof TFS)[number]>("1m");
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [candleNote, setCandleNote] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.05");
  const [slippageBps, setSlippageBps] = useState(100);
  const [quoteOut, setQuoteOut] = useState<string | null>(null);
  const [quoteRaw, setQuoteRaw] = useState<bigint | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leverage, setLeverage] = useState(1);

  const loadToken = useCallback(async (addr: string) => {
    setLoading(true);
    setLoadErr(null);
    setMarket(null);
    setCandles([]);
    try {
      const res = await fetch(`/api/token?ca=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Load failed");
      setMarket(data.market);
      setCa(data.market.token);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCa) loadToken(initialCa);
  }, [initialCa, loadToken]);

  const refreshCandles = useCallback(async () => {
    if (!market) return;
    try {
      const res = await fetch(
        `/api/candles?ca=${encodeURIComponent(market.token)}&tf=${tf}`
      );
      const data = await res.json();
      if (!data.ok) {
        setCandleNote(data.error || "No candles");
        return;
      }
      setCandles(data.candles || []);
      setCandleNote(data.note || data.source || "");
      if (data.market?.priceEth) {
        setMarket((m) => (m ? { ...m, priceEth: data.market.priceEth } : m));
      }
    } catch (e) {
      setCandleNote(e instanceof Error ? e.message : "Candle error");
    }
  }, [market, tf]);

  useEffect(() => {
    refreshCandles();
    const ms = tf === "1s" ? 1000 : tf === "1m" ? 15000 : 30000;
    const id = setInterval(refreshCandles, ms);
    return () => clearInterval(id);
  }, [refreshCandles, tf]);

  const refreshQuote = useCallback(async () => {
    if (!market || !amount || Number(amount) <= 0) {
      setQuoteOut(null);
      setQuoteRaw(null);
      return;
    }
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ca: market.token, side, amount }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Quote failed");
      setQuoteOut(data.amountOutFormatted);
      setQuoteRaw(BigInt(data.amountOut));
    } catch (e) {
      setQuoteOut(null);
      setQuoteRaw(null);
      setStatus(e instanceof Error ? e.message : "Quote error");
    }
  }, [market, side, amount]);

  useEffect(() => {
    const t = setTimeout(refreshQuote, 300);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  const minOut = useMemo(() => {
    if (quoteRaw == null) return 0n;
    return (quoteRaw * BigInt(10_000 - slippageBps)) / 10_000n;
  }, [quoteRaw, slippageBps]);

  async function onTrade() {
    setStatus(null);
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    if (!market) return;
    if (leverage > 1) {
      setStatus(
        "Leverage >1x requires KingMarginVault deployed + seeded with ETH. Use Spot (1x) or open /leverage."
      );
      return;
    }
    setBusy(true);
    try {
      const eip = walletProvider as unknown as import("ethers").Eip1193Provider;
      let receipt;
      if (side === "buy") {
        receipt = await swapBuyWithEth({
          eip1193: eip,
          token: market.token,
          ethAmount: amount,
          amountOutMin: minOut,
          kind: market.kind,
          fee: market.fee,
        });
      } else {
        receipt = await swapSellForEth({
          eip1193: eip,
          token: market.token,
          tokenAmount: amount,
          decimals: market.decimals,
          amountOutMin: minOut,
          kind: market.kind,
          fee: market.fee,
        });
      }
      const hash = receipt?.hash || receipt?.transactionHash;
      setStatus(hash ? `Tx confirmed: ${hash}` : "Tx confirmed");
      refreshCandles();
      refreshQuote();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <section className="kf-panel space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <label className="king-label">Token CA (any meme → TOKEN/ETH)</label>
            <input
              className="king-input font-mono text-sm"
              placeholder="0x… meme token on Robinhood"
              value={ca}
              onChange={(e) => setCa(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ca) loadToken(ca);
              }}
            />
          </div>
          <button
            type="button"
            className="king-btn-primary"
            disabled={loading || !ca}
            onClick={() => loadToken(ca)}
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>

        {loadErr && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {loadErr}
          </p>
        )}

        {market && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-lg font-black text-[var(--accent)]">
              {market.symbol}
              <span className="text-[var(--muted)]">/ETH</span>
            </span>
            <span className="font-mono text-[var(--ink)]">
              {market.priceEth < 1e-6
                ? market.priceEth.toExponential(4)
                : market.priceEth.toPrecision(6)}{" "}
              ETH
            </span>
            <span className="kf-chip">{market.kind.toUpperCase()}</span>
            {market.kind === "v3" && (
              <span className="kf-chip">fee {market.fee}</span>
            )}
            <span className="text-[var(--muted)]">
              Liq ~{market.liquidityEth.toFixed(4)} ETH
            </span>
            <a
              className="text-[var(--accent)] underline"
              href={`https://robinhoodchain.blockscout.com/address/${market.token}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(market.token)}
            </a>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {TFS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={`kf-tf ${tf === t ? "is-active" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        <LiveChart
          candles={candles}
          markPrice={market?.priceEth}
          height={360}
        />
        {candleNote && (
          <p className="text-xs text-[var(--muted)]">{candleNote}</p>
        )}
      </section>

      <aside className="kf-panel space-y-3 p-4">
        <div className="flex gap-1 rounded-xl bg-black/40 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              side === "buy"
                ? "bg-[var(--accent)] text-black"
                : "text-[var(--muted)]"
            }`}
            onClick={() => setSide("buy")}
          >
            Buy
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              side === "sell"
                ? "bg-rose-500 text-white"
                : "text-[var(--muted)]"
            }`}
            onClick={() => setSide("sell")}
          >
            Sell
          </button>
        </div>

        <div>
          <label className="king-label">
            {side === "buy" ? "Spend ETH" : `Sell ${market?.symbol || "TOKEN"}`}
          </label>
          <input
            className="king-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="kf-tf"
                onClick={() => setAmount(p)}
              >
                {side === "buy" ? `${p} ETH` : p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="king-label">
            Leverage {leverage}x (spot = 1x)
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          {leverage > 1 && (
            <p className="mt-1 text-xs text-amber-300">
              Real margin only via KingMarginVault — not simulated. Deploy/seed
              at /leverage. Spot swaps stay at 1x.
            </p>
          )}
        </div>

        <div>
          <label className="king-label">Slippage {slippageBps / 100}%</label>
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <div className="rounded-lg border border-[var(--cut)] bg-black/30 px-3 py-2 text-sm">
          <div className="text-[var(--muted)]">You receive (quote)</div>
          <div className="font-mono text-[var(--accent)]">
            {quoteOut
              ? `${Number(quoteOut).toPrecision(8)} ${
                  side === "buy" ? market?.symbol || "" : "ETH"
                }`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Min out:{" "}
            {minOut > 0n
              ? formatUnits(
                  minOut,
                  side === "buy" ? market?.decimals || 18 : 18
                )
              : "—"}
          </div>
        </div>

        <button
          type="button"
          className="king-btn-primary w-full py-3"
          disabled={busy || !market}
          onClick={onTrade}
        >
          {!isConnected
            ? "Connect Wallet"
            : busy
              ? "Confirm in wallet…"
              : leverage > 1
                ? "Leverage needs vault"
                : side === "buy"
                  ? `Buy ${market?.symbol || ""} with ETH`
                  : `Sell ${market?.symbol || ""} for ETH`}
        </button>

        {status && (
          <p className="break-all text-xs text-[var(--muted)]">
            {status.startsWith("Tx confirmed:") ? (
              <a
                className="text-[var(--accent)] underline"
                href={explorerTx(status.replace("Tx confirmed: ", ""))}
                target="_blank"
                rel="noreferrer"
              >
                {status}
              </a>
            ) : (
              status
            )}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          Live Spot on Uniswap (Robinhood 4663). Buys spend ETH, sells return
          ETH. You sign every tx. Live funds only.{" "}
          {address ? `Wallet ${shortAddr(address)}` : ""}
        </p>
      </aside>
    </div>
  );
}
