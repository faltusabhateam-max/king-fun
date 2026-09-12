"use client";

import { useEffect, useState } from "react";

type Alert = { id: string; ca: string; aboveEth?: number; belowEth?: number };

const KEY = "kingfun_alerts";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ca, setCa] = useState("");
  const [above, setAbove] = useState("");
  const [below, setBelow] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setAlerts(JSON.parse(localStorage.getItem(KEY) || "[]"));
  }, []);

  function save(next: Alert[]) {
    setAlerts(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  async function check() {
    setMsg("");
    for (const a of alerts) {
      try {
        const res = await fetch(`/api/token?ca=${a.ca}`);
        const data = await res.json();
        if (!data.ok) continue;
        const px = data.market.priceEth as number;
        if (a.aboveEth != null && px >= a.aboveEth) {
          setMsg(`${a.ca.slice(0, 8)}… above ${a.aboveEth} ETH (now ${px})`);
        }
        if (a.belowEth != null && px <= a.belowEth) {
          setMsg(`${a.ca.slice(0, 8)}… below ${a.belowEth} ETH (now ${px})`);
        }
      } catch {
        /* ignore */
      }
    }
    if (!msg) setMsg("Checked on-chain marks.");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-black">Alerts</h1>
      <p className="text-sm text-[var(--muted)]">
        Local price alerts vs real on-chain TOKEN/ETH marks. No fake feeds.
      </p>
      <div className="kf-panel space-y-2 p-4">
        <input className="king-input font-mono text-sm" placeholder="Token CA" value={ca} onChange={(e) => setCa(e.target.value.trim())} />
        <div className="grid grid-cols-2 gap-2">
          <input className="king-input" placeholder="Above ETH" value={above} onChange={(e) => setAbove(e.target.value)} />
          <input className="king-input" placeholder="Below ETH" value={below} onChange={(e) => setBelow(e.target.value)} />
        </div>
        <button
          type="button"
          className="king-btn-primary"
          onClick={() => {
            if (!/^0x[a-fA-F0-9]{40}$/.test(ca)) return;
            save([
              ...alerts,
              {
                id: crypto.randomUUID(),
                ca: ca.toLowerCase(),
                aboveEth: above ? Number(above) : undefined,
                belowEth: below ? Number(below) : undefined,
              },
            ]);
            setCa("");
            setAbove("");
            setBelow("");
          }}
        >
          Add alert
        </button>
        <button type="button" className="king-btn-ghost" onClick={check}>
          Check now
        </button>
        {msg && <p className="text-xs text-[var(--accent)]">{msg}</p>}
        <ul className="space-y-2 text-sm">
          {alerts.map((a) => (
            <li key={a.id} className="flex justify-between gap-2 border-b border-[var(--cut)]/40 py-2">
              <span className="font-mono text-xs">{a.ca}</span>
              <button
                type="button"
                className="text-rose-300"
                onClick={() => save(alerts.filter((x) => x.id !== a.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
