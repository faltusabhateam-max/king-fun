"use client";

import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { BrowserProvider, Contract, formatEther, formatUnits } from "ethers";
import { ERC20_ABI } from "@/lib/uniswap";
import { WalletButton } from "@/components/WalletButton";

const WATCH_KEY = "kingfun_watchlist";

export default function PortfolioPage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [ethBal, setEthBal] = useState<string>("—");
  const [rows, setRows] = useState<
    { token: string; symbol: string; balance: string }[]
  >([]);
  const [ca, setCa] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    if (!address || typeof window === "undefined") return;
    setErr(null);
    try {
      const ethereum = (window as unknown as { ethereum?: import("ethers").Eip1193Provider }).ethereum;
      if (!ethereum) {
        setErr("No wallet provider");
        return;
      }
      const provider = new BrowserProvider(ethereum);
      const bal = await provider.getBalance(address);
      setEthBal(formatEther(bal));
      const watch: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      const out: { token: string; symbol: string; balance: string }[] = [];
      for (const token of watch) {
        try {
          const c = new Contract(token, ERC20_ABI, provider);
          const [symbol, decimals, b] = await Promise.all([
            c.symbol(),
            c.decimals(),
            c.balanceOf(address),
          ]);
          out.push({
            token,
            symbol: String(symbol),
            balance: formatUnits(b, Number(decimals)),
          });
        } catch {
          /* skip */
        }
      }
      setRows(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Portfolio error");
    }
  }

  useEffect(() => {
    refresh();
  }, [address]);

  function addWatch() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(ca)) return;
    const watch: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    const next = [...new Set([...watch, ca.toLowerCase()])];
    localStorage.setItem(WATCH_KEY, JSON.stringify(next));
    setCa("");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">Portfolio</h1>
        <p className="text-sm text-[var(--muted)]">
          On-chain balances from your wallet (ETH + watched meme tokens).
        </p>
      </div>
      {!isConnected ? (
        <div className="kf-panel p-6">
          <p className="mb-3 text-sm text-[var(--muted)]">Connect to read balances.</p>
          <WalletButton />
        </div>
      ) : (
        <>
          <div className="kf-panel p-4">
            <div className="text-xs text-[var(--muted)]">ETH balance</div>
            <div className="font-mono text-2xl text-[var(--accent)]">
              {Number(ethBal).toPrecision(8)} ETH
            </div>
            <button type="button" className="king-btn-ghost mt-3 text-xs" onClick={refresh}>
              Refresh
            </button>
          </div>
          <div className="kf-panel space-y-3 p-4">
            <label className="king-label">Watch meme CA</label>
            <div className="flex gap-2">
              <input className="king-input font-mono text-sm" value={ca} onChange={(e) => setCa(e.target.value.trim())} placeholder="0x…" />
              <button type="button" className="king-btn-primary" onClick={addWatch}>Add</button>
            </div>
            <ul className="space-y-2 text-sm">
              {rows.map((r) => (
                <li key={r.token} className="flex justify-between border-b border-[var(--cut)]/40 py-2">
                  <span className="font-bold">{r.symbol}</span>
                  <span className="font-mono">{Number(r.balance).toPrecision(6)}</span>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="text-[var(--muted)]">No watched tokens yet.</li>
              )}
            </ul>
          </div>
        </>
      )}
      {err && <p className="text-sm text-rose-300">{err}</p>}
      <button type="button" className="hidden" onClick={() => open()} />
    </div>
  );
}
