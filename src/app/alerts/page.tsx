"use client";

import { useEffect, useState } from "react";
import {
  loadAlerts,
  saveAlerts,
  type PriceAlert,
} from "@/lib/alerts-store";
import { shortAddr } from "@/lib/format";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [ca, setCa] = useState("");
  const [pct, setPct] = useState("5");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [perm, setPerm] = useState<string>("default");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setAlerts(loadAlerts());
    if (typeof Notification !== "undefined") {
      setPerm(Notification.permission);
    }
  }, []);

  function persist(next: PriceAlert[]) {
    setAlerts(next);
    saveAlerts(next);
  }

  async function requestNotif() {
    if (typeof Notification === "undefined") {
      setMsg("Notifications not supported in this browser.");
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    setMsg(p === "granted" ? "Desktop notifications enabled." : "Permission denied.");
  }

  async function addAlert() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(ca)) {
      setMsg("Enter a valid token CA.");
      return;
    }
    const thresholdPct = Number(pct);
    if (!(thresholdPct > 0)) {
      setMsg("Threshold must be > 0%.");
      return;
    }
    setMsg("Loading on-chain mark…");
    try {
      const res = await fetch(`/api/token?ca=${encodeURIComponent(ca)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Token load failed");
      const baselineEth = Number(data.market.priceEth);
      if (!(baselineEth > 0)) throw new Error("No valid mark price");
      const row: PriceAlert = {
        id: crypto.randomUUID(),
        ca: ca.toLowerCase(),
        symbol: data.market.symbol,
        thresholdPct,
        direction,
        enabled: true,
        baselineEth,
      };
      persist([row, ...alerts]);
      setCa("");
      setMsg(`Watching ${data.market.symbol} · baseline ${baselineEth}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to add alert");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-black">Alerts</h1>
      <p className="text-sm text-[var(--muted)]">
        Watch a token CA for price up/down vs the real pool mark. Stored in
        localStorage. Optional browser notifications.
      </p>

      <div className="kf-panel space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--muted)]">Notifications: {perm}</span>
          <button type="button" className="king-btn-ghost py-1 text-xs" onClick={requestNotif}>
            Enable notifications
          </button>
        </div>
        <input
          className="king-input font-mono text-sm"
          placeholder="Token CA 0x…"
          value={ca}
          onChange={(e) => setCa(e.target.value.trim())}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="king-label">Threshold %</label>
            <input
              className="king-input"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="king-label">Direction</label>
            <select
              className="king-input"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "up" | "down")}
            >
              <option value="up">Price up</option>
              <option value="down">Price down</option>
            </select>
          </div>
        </div>
        <button type="button" className="king-btn-primary" onClick={addAlert}>
          Add alert
        </button>
        {msg && <p className="text-xs text-[var(--accent)]">{msg}</p>}
      </div>

      <ul className="space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="kf-panel flex flex-wrap items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                {a.symbol || shortAddr(a.ca)}{" "}
                <span className="text-[var(--muted)]">
                  {a.direction === "up" ? "↑" : "↓"} {a.thresholdPct}%
                </span>
              </div>
              <div className="font-mono text-[10px] text-[var(--muted)]">
                {a.ca} · base {a.baselineEth}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={a.enabled}
                onChange={(e) =>
                  persist(
                    alerts.map((x) =>
                      x.id === a.id ? { ...x, enabled: e.target.checked } : x
                    )
                  )
                }
              />
              On
            </label>
            <button
              type="button"
              className="text-xs text-rose-300"
              onClick={() => persist(alerts.filter((x) => x.id !== a.id))}
            >
              Remove
            </button>
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="text-sm text-[var(--muted)]">No alerts yet.</li>
        )}
      </ul>
    </div>
  );
}
