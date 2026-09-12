"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { BrowserProvider, Contract, formatEther, formatUnits } from "ethers";
import { ERC20_ABI } from "@/lib/uniswap";
import { WalletButton } from "@/components/WalletButton";
import { letterAvatarDataUrl, tokenLogoCandidates } from "@/lib/token-logo";
import { assessTokenRisk } from "@/lib/scam-heuristic";
import { shortAddr } from "@/lib/format";

const WATCH_KEY = "kingfun_watchlist";

type Row = {
  token: string;
  symbol: string;
  name: string;
  balance: string;
  logo: string;
  risk: ReturnType<typeof assessTokenRisk>;
  priceEth?: number;
  liquidityEth?: number;
};

function TokenLogo({
  symbol,
  token,
}: {
  symbol: string;
  token: string;
}) {
  const [i, setI] = useState(0);
  const candidates = [
    ...tokenLogoCandidates(token),
    letterAvatarDataUrl(symbol, token),
  ];
  const url = candidates[Math.min(i, candidates.length - 1)];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={symbol}
      width={36}
      height={36}
      className="h-9 w-9 rounded-xl border border-[var(--cut)] object-cover"
      onError={() => setI((n) => n + 1)}
    />
  );
}

export default function WalletPage() {
  const { address, isConnected } = useAppKitAccount();
  const [ethBal, setEthBal] = useState<string>("—");
  const [rows, setRows] = useState<Row[]>([]);
  const [ca, setCa] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || typeof window === "undefined") return;
    setErr(null);
    setBusy(true);
    try {
      const ethereum = (
        window as unknown as { ethereum?: import("ethers").Eip1193Provider }
      ).ethereum;
      if (!ethereum) {
        setErr("No wallet provider");
        return;
      }
      const provider = new BrowserProvider(ethereum);
      const bal = await provider.getBalance(address);
      setEthBal(formatEther(bal));
      const watch: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      const out: Row[] = [];
      for (const token of watch) {
        try {
          const c = new Contract(token, ERC20_ABI, provider);
          const [symbol, name, decimals, b] = await Promise.all([
            c.symbol().catch(() => "???"),
            c.name().catch(() => "Unknown"),
            c.decimals().catch(() => 18),
            c.balanceOf(address),
          ]);
          let priceEth = 0;
          let liquidityEth = 0;
          let sellQuoteOk: boolean | null = null;
          try {
            const res = await fetch(`/api/token?ca=${token}`);
            const data = await res.json();
            if (data.ok) {
              priceEth = data.market.priceEth;
              liquidityEth = data.market.liquidityEth;
              if (b > 0n) {
                const tiny =
                  b > 10n ** BigInt(Number(decimals))
                    ? formatUnits(10n ** BigInt(Number(decimals) - 2), Number(decimals))
                    : formatUnits(b, Number(decimals));
                const q = await fetch("/api/quote", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ca: token, side: "sell", amount: tiny }),
                });
                const qd = await q.json();
                sellQuoteOk = Boolean(qd.ok);
              }
            }
          } catch {
            /* soft */
          }
          const risk = assessTokenRisk({
            liquidityEth,
            sellQuoteOk,
            verified: null,
            blacklistedName: /scam|rug|honeypot/i.test(
              String(name) + String(symbol)
            ),
          });
          out.push({
            token,
            symbol: String(symbol),
            name: String(name),
            balance: formatUnits(b, Number(decimals)),
            logo: letterAvatarDataUrl(String(symbol), token),
            risk,
            priceEth,
            liquidityEth,
          });
        } catch {
          /* skip */
        }
      }
      setRows(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Wallet error");
    } finally {
      setBusy(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addWatch() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(ca)) {
      setErr("Enter a valid token CA (0x…)");
      return;
    }
    const watch: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    const next = [...new Set([...watch, ca.toLowerCase()])];
    localStorage.setItem(WATCH_KEY, JSON.stringify(next));
    setCa("");
    await refresh();
  }

  function removeWatch(token: string) {
    const watch: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    localStorage.setItem(
      WATCH_KEY,
      JSON.stringify(watch.filter((t) => t !== token.toLowerCase()))
    );
    refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">Wallet</h1>
        <p className="text-sm text-[var(--muted)]">
          Search by token CA · logos when available · holdings on Robinhood ·
          careful scam flag only on strong signals.
        </p>
      </div>
      {!isConnected ? (
        <div className="kf-panel p-6">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Connect to read ETH and token balances.
          </p>
          <WalletButton />
        </div>
      ) : (
        <>
          <div className="kf-panel p-4">
            <div className="text-xs text-[var(--muted)]">ETH balance</div>
            <div className="font-mono text-2xl text-[var(--accent)]">
              {Number(ethBal).toPrecision(8)} ETH
            </div>
            <button
              type="button"
              className="king-btn-ghost mt-3 text-xs"
              onClick={refresh}
              disabled={busy}
            >
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="kf-panel space-y-3 p-4">
            <label className="king-label">Search / watch token CA</label>
            <div className="flex gap-2">
              <input
                className="king-input font-mono text-sm"
                value={ca}
                onChange={(e) => setCa(e.target.value.trim())}
                placeholder="0x…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addWatch();
                }}
              />
              <button type="button" className="king-btn-primary" onClick={addWatch}>
                Add
              </button>
            </div>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.token}
                  className="flex flex-wrap items-center gap-3 border-b border-[var(--cut)]/40 py-3"
                >
                  <TokenLogo symbol={r.symbol} token={r.token} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{r.symbol}</span>
                      {(r.risk.level === "scam" || r.risk.level === "watch") && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                            r.risk.level === "scam"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500/20 text-amber-200"
                          }`}
                          title={r.risk.reasons.join(" · ")}
                        >
                          {r.risk.label}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-[10px] text-[var(--muted)]">
                      {shortAddr(r.token)}
                      {r.liquidityEth != null
                        ? ` · liq ${r.liquidityEth.toFixed(4)} ETH`
                        : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {Number(r.balance).toPrecision(6)}
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <Link
                        href={`/trade?ca=${r.token}`}
                        className="text-[var(--accent)] underline"
                      >
                        Trade
                      </Link>
                      <button
                        type="button"
                        className="text-rose-300"
                        onClick={() => removeWatch(r.token)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="text-sm text-[var(--muted)]">
                  No watched tokens yet. Paste a CA to search and track.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
      {err && <p className="text-sm text-rose-300">{err}</p>}
    </div>
  );
}
