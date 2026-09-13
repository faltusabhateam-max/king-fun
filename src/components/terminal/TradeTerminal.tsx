"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { formatUnits } from "ethers";
import { LiveChart, type ChartCandle, type ChartTradeMark, type LiveTick } from "./LiveChart";
import { swapBuyWithEth, swapSellForEth } from "@/lib/swap-client";
import {
  openLong,
  closeLong,
  liquidate,
  fetchOpenPositions,
  preflightClose,
  readVaultStats,
} from "@/lib/vault-client";
import { ADDRESSES, explorerTx } from "@/lib/robinhood";
import { shortAddr } from "@/lib/format";
import {
  TxConfirmSheet,
  type TxConfirmDetails,
  type TxConfirmStatus,
} from "@/components/TxConfirmSheet";

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

type TapeTrade = {
  time: number;
  price: number;
  volEth: number;
  side: "buy" | "sell";
  txHash: string;
};

type Mode = "spot" | "leverage";
type PendingKind =
  | "buy"
  | "sell"
  | "openLong"
  | "closeLong"
  | "liquidate"
  | null;

const TFS = ["1s", "1m", "5m", "15m", "1h", "4h", "1D"] as const;
const PRESETS = ["0.01", "0.05", "0.1", "0.25", "0.5", "1"] as const;

function isUserReject(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /user rejected|denied|rejected the request|ACTION_REJECTED/i.test(msg);
}

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
  const [liveTicks, setLiveTicks] = useState<LiveTick[]>([]);
  const [candleNote, setCandleNote] = useState("");
  const [tape, setTape] = useState<TapeTrade[]>([]);
  const [tapeNote, setTapeNote] = useState("");
  const [markers, setMarkers] = useState<ChartTradeMark[]>([]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<Mode>("spot");
  const [amount, setAmount] = useState("0.05");
  const [slippageBps, setSlippageBps] = useState(100);
  const [quoteOut, setQuoteOut] = useState<string | null>(null);
  const [quoteRaw, setQuoteRaw] = useState<bigint | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [leverage, setLeverage] = useState(5);
  const [vaultStats, setVaultStats] = useState<{
    freeEth: string;
    totalLenderEth: string;
    maxLeverage: number;
  } | null>(null);
  const [positions, setPositions] = useState<
    {
      id: number;
      token: string;
      marginEth: string;
      debtEth: string;
      underwater?: boolean;
    }[]
  >([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<TxConfirmStatus>("review");
  const [sheetMsg, setSheetMsg] = useState<string | undefined>();
  const [sheetDetails, setSheetDetails] = useState<TxConfirmDetails | null>(
    null
  );
  const [pendingKind, setPendingKind] = useState<PendingKind>(null);
  const [pendingCloseId, setPendingCloseId] = useState<number | null>(null);

  const loadToken = useCallback(async (addr: string) => {
    setLoading(true);
    setLoadErr(null);
    setMarket(null);
    setCandles([]);
    setLiveTicks([]);
    setTape([]);
    setMarkers([]);
    try {
      const res = await fetch(`/api/token?ca=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Load failed");
      setMarket(data.market);
      setCa(data.market.token);
      if (data.market?.priceEth > 0) {
        const tSec = Math.floor(Date.now() / 1000);
        setLiveTicks([{ time: tSec, value: data.market.priceEth }]);
      }
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
        setCandles([]);
        return;
      }
      setCandles(data.candles || []);
      setCandleNote(data.note || data.source || "");
      if (data.market?.priceEth > 0) {
        const px = data.market.priceEth as number;
        setMarket((m) => (m ? { ...m, priceEth: px } : m));
        const tSec = Math.floor(Date.now() / 1000);
        setLiveTicks((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.time === tSec) next[next.length - 1] = { time: tSec, value: px };
          else next.push({ time: tSec, value: px });
          return next.length > 600 ? next.slice(next.length - 600) : next;
        });
      }
    } catch (e) {
      setCandleNote(e instanceof Error ? e.message : "Candle error");
    }
  }, [market, tf]);

  const refreshTape = useCallback(async () => {
    if (!market) return;
    try {
      const res = await fetch(
        `/api/trades?ca=${encodeURIComponent(market.token)}&limit=36`
      );
      const data = await res.json();
      if (!data.ok) {
        setTape([]);
        setMarkers([]);
        setTapeNote(data.error || "No trades");
        return;
      }
      const trades = (data.trades || []) as TapeTrade[];
      setTape(trades);
      setTapeNote(data.note || "");
      setMarkers(
        trades.slice(0, 24).map((t) => ({
          time: t.time,
          side: t.side,
          price: t.price,
        }))
      );
    } catch (e) {
      setTapeNote(e instanceof Error ? e.message : "Tape error");
    }
  }, [market]);

  const pushLiveTick = useCallback((price: number) => {
    if (!(price > 0)) return;
    const tSec = Math.floor(Date.now() / 1000);
    setLiveTicks((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.time === tSec) {
        next[next.length - 1] = { time: tSec, value: price };
      } else {
        next.push({ time: tSec, value: price });
      }
      return next.length > 600 ? next.slice(next.length - 600) : next;
    });
  }, []);

  const refreshMarkPrice = useCallback(async () => {
    if (!market) return;
    try {
      const res = await fetch(
        `/api/token?ca=${encodeURIComponent(market.token)}`
      );
      const data = await res.json();
      if (data.ok && data.market?.priceEth > 0) {
        const px = data.market.priceEth as number;
        setMarket((m) => (m ? { ...m, priceEth: px } : m));
        pushLiveTick(px);
      }
    } catch {
      /* soft */
    }
  }, [market, pushLiveTick]);

  useEffect(() => {
    refreshCandles();
    refreshTape();
    refreshMarkPrice();
    const ms = tf === "1s" ? 1000 : tf === "1m" ? 5000 : tf === "5m" ? 10000 : 20000;
    const id = setInterval(() => {
      refreshCandles();
      refreshTape();
      refreshMarkPrice();
    }, ms);
    return () => clearInterval(id);
  }, [refreshCandles, refreshTape, refreshMarkPrice, tf]);

  const refreshVault = useCallback(async () => {
    try {
      const stats = await readVaultStats(
        walletProvider
          ? (walletProvider as unknown as import("ethers").Eip1193Provider)
          : undefined
      );
      setVaultStats({
        freeEth: stats.freeEth,
        totalLenderEth: stats.totalLenderEth,
        maxLeverage: stats.maxLeverage,
      });
      if (address && walletProvider) {
        const pos = await fetchOpenPositions(
          walletProvider as unknown as import("ethers").Eip1193Provider,
          address
        );
        setPositions(pos);
      }
    } catch {
      /* vault may be empty / rpc soft-fail */
    }
  }, [address, walletProvider]);

  useEffect(() => {
    refreshVault();
    const id = setInterval(refreshVault, 30000);
    return () => clearInterval(id);
  }, [refreshVault]);

  const refreshQuote = useCallback(async () => {
    if (!market || !amount || Number(amount) <= 0) {
      setQuoteOut(null);
      setQuoteRaw(null);
      return;
    }
    if (mode === "leverage" && side === "sell") {
      setQuoteOut(null);
      setQuoteRaw(null);
      return;
    }
    try {
      const quoteSide = mode === "leverage" ? "buy" : side;
      const quoteAmount =
        mode === "leverage"
          ? String(Number(amount) * Math.max(2, leverage))
          : amount;
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ca: market.token,
          side: quoteSide,
          amount: quoteAmount,
        }),
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
  }, [market, side, amount, mode, leverage]);

  useEffect(() => {
    const t = setTimeout(refreshQuote, 300);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  const minOut = useMemo(() => {
    if (quoteRaw == null) return 0n;
    return (quoteRaw * BigInt(10_000 - slippageBps)) / 10_000n;
  }, [quoteRaw, slippageBps]);

  function openConfirmSheet() {
    setStatus(null);
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    if (!market) return;

    if (mode === "leverage") {
      if (market.kind !== "v2") {
        setStatus("Leverage longs require a Uniswap V2 TOKEN/ETH pool.");
        return;
      }
      setPendingKind("openLong");
      setSheetDetails({
        title: "Open leveraged long",
        mode: "Leverage",
        action: `Borrow from KingMarginVault and buy ${market.symbol} with ETH.`,
        tokenLabel: `${market.symbol} · ${shortAddr(market.token)}`,
        amountLabel: `${amount} ETH margin`,
        leverageLabel: `${leverage}x (notional ~${(
          Number(amount) * leverage
        ).toPrecision(4)} ETH)`,
        receiveLabel: quoteOut
          ? `~${Number(quoteOut).toPrecision(6)} ${market.symbol}`
          : "—",
        vaultLabel: shortAddr(ADDRESSES.marginVault),
        gasHint: "Network fee shown in wallet",
        footnotes: [
          "You confirm here first. Wallet approval is the final step.",
          "Liquidation risk if price moves against the position.",
          vaultStats
            ? `Vault free liquidity ~${Number(vaultStats.freeEth).toPrecision(4)} ETH`
            : "Vault liquidity loads from chain.",
        ],
      });
    } else if (side === "buy") {
      setPendingKind("buy");
      setSheetDetails({
        title: "Buy with ETH",
        mode: "Spot",
        action: `Swap ETH → ${market.symbol} on Uniswap (${market.kind.toUpperCase()}).`,
        tokenLabel: `${market.symbol} · ${shortAddr(market.token)}`,
        amountLabel: `${amount} ETH`,
        receiveLabel: quoteOut
          ? `~${Number(quoteOut).toPrecision(6)} ${market.symbol}`
          : "—",
        gasHint: "Network fee shown in wallet",
        footnotes: [
          "Spot 1x — no borrowed funds.",
          "You confirm in-app, then approve in your wallet.",
        ],
      });
    } else {
      setPendingKind("sell");
      setSheetDetails({
        title: "Sell for ETH",
        mode: "Spot",
        action: `Swap ${market.symbol} → ETH on Uniswap (${market.kind.toUpperCase()}).`,
        tokenLabel: `${market.symbol} · ${shortAddr(market.token)}`,
        amountLabel: `${amount} ${market.symbol}`,
        receiveLabel: quoteOut
          ? `~${Number(quoteOut).toPrecision(6)} ETH`
          : "—",
        gasHint: "May request token approve, then swap",
        footnotes: [
          "If allowance is missing, wallet will ask to Approve first.",
          "You confirm in-app, then approve in your wallet.",
        ],
      });
    }
    setSheetStatus("review");
    setSheetMsg(undefined);
    setSheetOpen(true);
  }

  function liquidateSheetDetails(id: number) {
    const pos = positions.find((p) => p.id === id);
    return {
      title: `Liquidate position #${id}`,
      mode: "Leverage" as const,
      action:
        "Position is underwater. Liquidate sells tokens, writes off debt, and pays a 1% liquidator reward.",
      tokenLabel: pos ? shortAddr(pos.token) : "—",
      amountLabel: pos
        ? `Margin ${Number(pos.marginEth).toPrecision(4)} ETH · Debt ${Number(pos.debtEth).toPrecision(4)} ETH`
        : undefined,
      vaultLabel: shortAddr(ADDRESSES.marginVault),
      footnotes: [
        "Close cannot repay debt when sale proceeds are below debt.",
        "Anyone can liquidate an underwater position. Confirm here, then approve in wallet.",
      ],
    };
  }

  function askLiquidatePosition(id: number) {
    setStatus(null);
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    setPendingKind("liquidate");
    setPendingCloseId(id);
    setSheetDetails(liquidateSheetDetails(id));
    setSheetStatus("review");
    setSheetMsg(undefined);
    setSheetOpen(true);
  }

  function askClosePosition(id: number) {
    setStatus(null);
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    const pos = positions.find((p) => p.id === id);
    if (pos?.underwater) {
      askLiquidatePosition(id);
      return;
    }
    setPendingKind("closeLong");
    setPendingCloseId(id);
    setSheetDetails({
      title: `Close position #${id}`,
      mode: "Leverage",
      action: "Sell vault tokens for ETH, repay debt, return equity.",
      tokenLabel: pos ? shortAddr(pos.token) : "—",
      amountLabel: pos
        ? `Margin ${Number(pos.marginEth).toPrecision(4)} ETH · Debt ${Number(pos.debtEth).toPrecision(4)} ETH`
        : undefined,
      vaultLabel: shortAddr(ADDRESSES.marginVault),
      footnotes: ["Confirm here, then approve the close in your wallet."],
    });
    setSheetStatus("review");
    setSheetMsg(undefined);
    setSheetOpen(true);
  }

  async function executePending() {
    if (!walletProvider || !pendingKind) return;
    const needsMarket =
      pendingKind === "buy" ||
      pendingKind === "sell" ||
      pendingKind === "openLong";
    if (needsMarket && !market) return;
    const mkt = market;
    const eip = walletProvider as unknown as import("ethers").Eip1193Provider;
    setSheetStatus("waiting_wallet");
    setSheetMsg(undefined);
    try {
      let receipt;
      if (pendingKind === "buy") {
        if (!mkt) return;
        setSheetStatus("waiting_wallet");
        const txPromise = swapBuyWithEth({
          eip1193: eip,
          token: mkt.token,
          ethAmount: amount,
          amountOutMin: minOut,
          kind: mkt.kind,
          fee: mkt.fee,
        });
        setSheetStatus("pending");
        receipt = await txPromise;
      } else if (pendingKind === "sell") {
        if (!mkt) return;
        const txPromise = swapSellForEth({
          eip1193: eip,
          token: mkt.token,
          tokenAmount: amount,
          decimals: mkt.decimals,
          amountOutMin: minOut,
          kind: mkt.kind,
          fee: mkt.fee,
        });
        setSheetStatus("pending");
        receipt = await txPromise;
      } else if (pendingKind === "openLong") {
        if (!mkt) return;
        const txPromise = openLong({
          eip1193: eip,
          token: mkt.token,
          leverage,
          marginEth: amount,
          amountOutMin: minOut,
        });
        setSheetStatus("pending");
        receipt = await txPromise;
      } else if (pendingKind === "closeLong" && pendingCloseId != null) {
        const pf = await preflightClose({
          eip1193: eip,
          positionId: pendingCloseId,
        });
        if (pf.underwater) {
          setPendingKind("liquidate");
          setSheetDetails(liquidateSheetDetails(pendingCloseId));
          setSheetStatus("error");
          setSheetMsg(
            pf.reason ||
              "Position is underwater. Close is blocked — tap Try again to Liquidate."
          );
          return;
        }
        if (!pf.ok) {
          throw new Error(pf.reason || "Close would revert");
        }
        const txPromise = closeLong({
          eip1193: eip,
          positionId: pendingCloseId,
          amountOutMinEth: 0n,
        });
        setSheetStatus("pending");
        receipt = await txPromise;
      } else if (pendingKind === "liquidate" && pendingCloseId != null) {
        const txPromise = liquidate({
          eip1193: eip,
          positionId: pendingCloseId,
          amountOutMinEth: 0n,
        });
        setSheetStatus("pending");
        receipt = await txPromise;
      }
      const hash = receipt?.hash || receipt?.transactionHash;
      setSheetStatus("confirmed");
      setStatus(hash ? `Tx confirmed: ${hash}` : "Tx confirmed");
      refreshCandles();
      refreshTape();
      refreshQuote();
      refreshVault();
    } catch (e) {
      if (isUserReject(e)) {
        setSheetStatus("rejected");
        setSheetMsg("You rejected the request in your wallet.");
      } else {
        setSheetStatus("error");
        setSheetMsg(e instanceof Error ? e.message : "Transaction failed");
      }
    }
  }

  const emptyChart =
    !loading &&
    !!market &&
    candles.length === 0 &&
    liveTicks.length === 0 &&
    !(market.priceEth > 0);

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

        {!market && !loading ? (
          <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-[var(--cut)] text-sm text-[var(--muted)]">
            Paste a token CA and Load to open the live line chart.
          </div>
        ) : emptyChart ? (
          <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-[var(--cut)] text-sm text-[var(--muted)]">
            Waiting for mark price…
          </div>
        ) : (
          <LiveChart
            candles={candles}
            markPrice={market?.priceEth}
            markers={markers}
            liveTicks={liveTicks}
            height={360}
          />
        )}
        {candleNote && (
          <p className="text-xs text-[var(--muted)]">{candleNote}</p>
        )}

        <div className="rounded-xl border border-[var(--cut)] bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              Live trades
            </h3>
            <span className="text-[10px] text-[var(--muted)]">
              On-chain Swap · B buy / S sell
            </span>
          </div>
          {tape.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              {tapeNote ||
                "No recent swaps. Empty tape — never filled with fake prints."}
            </p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
              {tape.map((t) => (
                <li
                  key={t.txHash + String(t.time)}
                  className="flex items-center justify-between gap-2 border-b border-[var(--cut)]/30 py-1.5 font-mono"
                >
                  <span
                    className={
                      t.side === "buy" ? "text-[var(--accent)]" : "text-rose-400"
                    }
                  >
                    {t.side === "buy" ? "B BUY" : "S SELL"}
                  </span>
                  <span>{t.volEth.toPrecision(4)} ETH</span>
                  <span className="text-[var(--muted)]">
                    {new Date(t.time * 1000).toLocaleTimeString()}
                  </span>
                  <a
                    className="text-[var(--accent)] underline"
                    href={explorerTx(t.txHash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    tx
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="kf-panel space-y-3 p-4">
        <div className="flex gap-1 rounded-xl bg-black/40 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              mode === "spot"
                ? "bg-[var(--accent)] text-black"
                : "text-[var(--muted)]"
            }`}
            onClick={() => setMode("spot")}
          >
            Spot
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              mode === "leverage"
                ? "bg-[var(--accent)] text-black"
                : "text-[var(--muted)]"
            }`}
            onClick={() => {
              setMode("leverage");
              setSide("buy");
            }}
          >
            Leverage
          </button>
        </div>

        {mode === "spot" ? (
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
              Buy with ETH
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
              Sell for ETH
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--cut)] bg-black/25 px-3 py-2 text-xs text-[var(--muted)]">
            Leverage mode opens an isolated long via KingMarginVault. Margin in
            ETH · vault{" "}
            <span className="font-mono text-[var(--accent)]">
              {shortAddr(ADDRESSES.marginVault)}
            </span>
            {vaultStats
              ? ` · free ~${Number(vaultStats.freeEth).toPrecision(4)} ETH`
              : ""}
          </p>
        )}

        <div>
          <label className="king-label">
            {mode === "leverage"
              ? "Margin (ETH)"
              : side === "buy"
                ? "Buy with ETH (amount)"
                : `Sell ${market?.symbol || "TOKEN"} for ETH`}
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
                {mode === "leverage" || side === "buy" ? `${p} ETH` : p}
              </button>
            ))}
          </div>
        </div>

        {mode === "leverage" && (
          <div>
            <label className="king-label">Leverage {leverage}x</label>
            <input
              type="range"
              min={2}
              max={vaultStats?.maxLeverage || 50}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>
        )}

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
          <div className="text-[var(--muted)]">
            {mode === "leverage" ? "Est. tokens (notional)" : "You receive (quote)"}
          </div>
          <div className="font-mono text-[var(--accent)]">
            {quoteOut
              ? `${Number(quoteOut).toPrecision(8)} ${
                  mode === "leverage" || side === "buy"
                    ? market?.symbol || ""
                    : "ETH"
                }`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Min out:{" "}
            {minOut > 0n
              ? formatUnits(
                  minOut,
                  mode === "leverage" || side === "buy"
                    ? market?.decimals || 18
                    : 18
                )
              : "—"}
          </div>
        </div>

        <button
          type="button"
          className="king-btn-primary w-full py-3"
          disabled={!market}
          onClick={openConfirmSheet}
        >
          {!isConnected
            ? "Connect Wallet"
            : mode === "leverage"
              ? `Open ${leverage}x long`
              : side === "buy"
                ? `Buy ${market?.symbol || ""} with ETH`
                : `Sell ${market?.symbol || ""} for ETH`}
        </button>

        {mode === "leverage" && positions.length > 0 && (
          <div className="space-y-2 rounded-lg border border-[var(--cut)] p-2">
            <div className="text-xs font-bold text-[var(--accent)]">
              Your open positions
            </div>
            {positions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono">
                  #{p.id} · m {Number(p.marginEth).toPrecision(3)} · d{" "}
                  {Number(p.debtEth).toPrecision(3)}
                  {p.underwater ? (
                    <span className="ml-1 text-rose-400">· underwater</span>
                  ) : null}
                </span>
                {p.underwater ? (
                  <button
                    type="button"
                    className="rounded-md bg-rose-500 px-2 py-1 text-[11px] font-bold text-white"
                    onClick={() => askLiquidatePosition(p.id)}
                  >
                    Liquidate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="king-btn-ghost px-2 py-1 text-[11px]"
                    onClick={() => askClosePosition(p.id)}
                  >
                    Close
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
          Confirm in KINGFUN first, then approve in wallet. Spot = Uniswap.
          Leverage = KingMarginVault.{" "}
          {address ? `Wallet ${shortAddr(address)}` : ""}
        </p>
      </aside>

      <TxConfirmSheet
        open={sheetOpen}
        details={sheetDetails}
        status={sheetStatus}
        statusMessage={sheetMsg}
        onConfirm={executePending}
        onClose={() => {
          if (sheetStatus === "waiting_wallet" || sheetStatus === "pending")
            return;
          setSheetOpen(false);
          setSheetMsg(undefined);
          setPendingKind(null);
          setPendingCloseId(null);
        }}
      />
    </div>
  );
}
