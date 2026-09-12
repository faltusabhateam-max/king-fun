"use client";

import { useMemo, useState } from "react";

export default function CalculatorsPage() {
  const [entry, setEntry] = useState("0.0001");
  const [exit, setExit] = useState("0.00012");
  const [sizeEth, setSizeEth] = useState("1");
  const [lev, setLev] = useState("1");
  const [feeBps, setFeeBps] = useState("30");

  const result = useMemo(() => {
    const e = Number(entry);
    const x = Number(exit);
    const s = Number(sizeEth);
    const l = Math.max(1, Number(lev));
    const fee = Number(feeBps) / 10000;
    if (![e, x, s, l].every(Number.isFinite) || e <= 0) return null;
    const notional = s * l;
    const tokens = notional / e;
    const gross = tokens * x - notional;
    const fees = notional * fee * 2;
    const pnl = gross - fees;
    const liqApprox = e * (1 - 1 / l) * (1 - 0.02);
    const breakeven = e * (1 + fee * 2);
    return { tokens, pnl, fees, liqApprox, breakeven, notional };
  }, [entry, exit, sizeEth, lev, feeBps]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-black">Calculators</h1>
      <p className="text-sm text-[var(--muted)]">
        Pure math helpers priced in ETH. Not execution quotes.
      </p>
      <div className="kf-panel grid gap-3 p-4">
        {[
          ["Entry ETH", entry, setEntry],
          ["Exit ETH", exit, setExit],
          ["Margin ETH", sizeEth, setSizeEth],
          ["Leverage", lev, setLev],
          ["Fee bps (round-trip each side)", feeBps, setFeeBps],
        ].map(([label, val, set]) => (
          <div key={label as string}>
            <label className="king-label">{label as string}</label>
            <input
              className="king-input"
              value={val as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
            />
          </div>
        ))}
        {result && (
          <div className="space-y-1 font-mono text-sm text-[var(--accent)]">
            <div>Notional: {result.notional.toPrecision(6)} ETH</div>
            <div>Tokens: {result.tokens.toPrecision(6)}</div>
            <div>Fees est: {result.fees.toPrecision(6)} ETH</div>
            <div>PnL est: {result.pnl.toPrecision(6)} ETH</div>
            <div>Breakeven ~ {result.breakeven.toPrecision(6)} ETH</div>
            <div>Approx liq (isolated): {result.liqApprox.toPrecision(6)} ETH</div>
          </div>
        )}
      </div>
    </div>
  );
}
