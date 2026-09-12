"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { RPC_URL } from "@/lib/solana";
import { formatSol, formatNumber } from "@/lib/format";

type Side = "buy" | "sell";

export function TradePanel({
  mint,
  symbol,
  mode,
  creatorFeeBps,
  onTraded,
}: {
  mint: string;
  symbol: string;
  mode: "jupiter" | "curve";
  creatorFeeBps?: number;
  onTraded?: () => void;
}) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("0.1");
  const [quote, setQuote] = useState<{
    outAmount: number;
    fee?: number;
    impact?: number;
    raw?: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    const n = Number(amount);
    if (!n || n <= 0) {
      setQuote(null);
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      if (mode === "jupiter") {
        const res = await fetch("/api/jupiter/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint,
            side,
            amount: n,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Quote failed");
        setQuote({
          outAmount: data.outAmountUi,
          impact: data.priceImpactPct,
          raw: data.quote,
        });
      } else {
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint,
            side,
            amount: n,
            quoteOnly: true,
            trader: address || "anonymous",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Curve quote failed");
        setQuote({
          outAmount: side === "buy" ? data.tokensOut : data.solOut,
          fee: data.creatorFeeSol,
          impact: data.priceImpact,
        });
      }
    } catch (e) {
      setQuote(null);
      setStatus(e instanceof Error ? e.message : "Quote error");
    } finally {
      setLoading(false);
    }
  }, [amount, mint, mode, side, address]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 350);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  async function execute() {
    if (!isConnected || !address) {
      open();
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      if (mode === "jupiter") {
        if (!quote?.raw) throw new Error("No quote");
        const res = await fetch("/api/jupiter/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse: quote.raw,
            userPublicKey: address,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Swap prep failed");
        if (!walletProvider) throw new Error("Wallet provider missing");

        const txBuf = Buffer.from(data.swapTransaction, "base64");
        const tx = VersionedTransaction.deserialize(txBuf);
        const sig = await walletProvider.signAndSendTransaction(tx);
        const connection = new Connection(RPC_URL, "confirmed");
        await connection.confirmTransaction(sig, "confirmed");
        setStatus(`Swap sent: ${sig.slice(0, 12)}…`);
        onTraded?.();
      } else {
        // King Curve: until on-chain program is deployed, record trade + update curve state.
        // User acknowledges via wallet message sign when available.
        if (walletProvider?.signMessage) {
          const msg = new TextEncoder().encode(
            `king.fun King Curve ${side} ${amount} SOL → $${symbol} (${mint})`
          );
          try {
            await walletProvider.signMessage(msg);
          } catch {
            /* user may reject message; still allow curve accounting if they confirm intent */
          }
        }
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint,
            side,
            amount: Number(amount),
            trader: address,
            quoteOnly: false,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Trade failed");
        setStatus(
          `Curve ${side} recorded. Fee ${formatSol(data.creatorFeeSol)}. On-chain curve program pending deploy.`
        );
        onTraded?.();
        fetchQuote();
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="king-panel p-4 sm:p-5">
      <div className="mb-4 flex rounded-full border border-emerald-400/20 bg-black/30 p-1">
        {(["buy", "sell"] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`flex-1 rounded-full py-2 text-sm font-bold capitalize transition ${
              side === s
                ? s === "buy"
                  ? "bg-[#00e88f] text-[#00140c]"
                  : "bg-rose-500 text-white"
                : "text-[#e8eee9]/60 hover:text-[#e8eee9]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <label className="king-label">
        {side === "buy" ? "SOL amount" : `${symbol} amount`}
      </label>
      <input
        className="king-input mb-3"
        type="number"
        min="0"
        step="any"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="mb-4 space-y-1 rounded-xl border border-emerald-400/10 bg-black/25 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#e8eee9]/50">You receive</span>
          <span className="font-semibold text-[#00e88f]">
            {quote
              ? side === "buy"
                ? `${formatNumber(quote.outAmount)} ${symbol}`
                : formatSol(quote.outAmount)
              : "—"}
          </span>
        </div>
        {mode === "curve" && (
          <div className="flex justify-between">
            <span className="text-[#e8eee9]/50">
              Creator fee ({((creatorFeeBps ?? 100) / 100).toFixed(2)}%)
            </span>
            <span>{formatSol(quote?.fee)}</span>
          </div>
        )}
        {quote?.impact != null && (
          <div className="flex justify-between">
            <span className="text-[#e8eee9]/50">Impact</span>
            <span>{quote.impact.toFixed?.(2) ?? quote.impact}%</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-[#e8eee9]/40">
          <span>Route</span>
          <span>{mode === "jupiter" ? "Jupiter" : "King Curve"}</span>
        </div>
      </div>

      <button
        type="button"
        className="king-btn-primary w-full py-3"
        disabled={loading}
        onClick={execute}
      >
        {!isConnected
          ? "Connect Wallet"
          : loading
            ? "Working…"
            : `${side === "buy" ? "Buy" : "Sell"} $${symbol}`}
      </button>

      {status && (
        <p className="mt-3 text-center text-xs text-[#e8eee9]/60">{status}</p>
      )}
    </div>
  );
}
