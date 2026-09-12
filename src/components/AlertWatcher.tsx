"use client";

import { useEffect } from "react";
import { loadAlerts, saveAlerts } from "@/lib/alerts-store";

/** Polls enabled alerts vs on-chain mark; fires Notification API when permitted. */
export function AlertWatcher() {
  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive) return;
      const alerts = loadAlerts().filter((a) => a.enabled);
      if (!alerts.length) return;
      let changed = false;
      const next = [...loadAlerts()];
      for (const a of alerts) {
        try {
          const res = await fetch(`/api/token?ca=${encodeURIComponent(a.ca)}`);
          const data = await res.json();
          if (!data.ok) continue;
          const px = Number(data.market.priceEth);
          if (!(px > 0) || !(a.baselineEth > 0)) continue;
          const pct = ((px - a.baselineEth) / a.baselineEth) * 100;
          const hit =
            (a.direction === "up" && pct >= a.thresholdPct) ||
            (a.direction === "down" && pct <= -a.thresholdPct);
          if (!hit) continue;
          const cool = a.lastFiredAt && Date.now() - a.lastFiredAt < 5 * 60_000;
          if (cool) continue;
          const title = `KINGFUN alert · ${a.symbol || a.ca.slice(0, 8)}`;
          const body = `${a.direction === "up" ? "Up" : "Down"} ${Math.abs(pct).toFixed(2)}% (threshold ${a.thresholdPct}%). Mark ${px}`;
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification(title, { body });
            } catch {
              /* ignore */
            }
          }
          const idx = next.findIndex((x) => x.id === a.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], lastFiredAt: Date.now() };
            changed = true;
          }
        } catch {
          /* soft */
        }
      }
      if (changed) saveAlerts(next);
    }
    tick();
    const id = setInterval(tick, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return null;
}
