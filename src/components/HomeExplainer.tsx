"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CTAS = [
  { href: "/trade", label: "Trade", primary: true },
  { href: "/discover", label: "Discover" },
  { href: "/portfolio", label: "Wallet" },
  { href: "/alerts", label: "Alerts" },
  { href: "/leverage", label: "Leverage" },
  { href: "/about", label: "About" },
];

const STEPS = [
  {
    n: "01",
    title: "Paste CA",
    copy: "Drop any Robinhood meme contract. We resolve the TOKEN/ETH pool.",
    visual: "ca",
  },
  {
    n: "02",
    title: "Live chart",
    copy: "Line chart from real Swap events. Buys mark B · sells mark S.",
    visual: "chart",
  },
  {
    n: "03",
    title: "Buy / Sell ETH",
    copy: "Spot swaps settle in ETH. Confirm in-app, then approve in wallet.",
    visual: "trade",
  },
  {
    n: "04",
    title: "Leverage vault",
    copy: "Open isolated longs via KingMarginVault with real lender ETH.",
    visual: "vault",
  },
];

function PanelVisual({ kind }: { kind: string }) {
  if (kind === "ca") {
    return (
      <div className="kf-motion-panel relative overflow-hidden">
        <motion.div
          className="absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 rounded-lg border border-[var(--accent)]/50 bg-black/50 px-3 font-mono text-xs text-[var(--accent)]"
          initial={{ opacity: 0.4, x: -12 }}
          animate={{ opacity: [0.4, 1, 1, 0.6], x: [-12, 0, 0, 8] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="opacity-50">0x</span>
          <motion.span
            animate={{ opacity: [0.2, 1, 1] }}
            transition={{ duration: 3.2, repeat: Infinity }}
          >
            a1b2…meme
          </motion.span>
          <motion.div
            className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-md bg-[var(--accent)]"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </motion.div>
        <div className="kf-scanline" />
      </div>
    );
  }
  if (kind === "chart") {
    return (
      <div className="kf-motion-panel relative overflow-hidden p-4">
        <svg viewBox="0 0 240 100" className="h-full w-full">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e88f" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00e88f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0 80 C40 70, 60 40, 100 45 S160 20, 200 28 S230 10, 240 18 L240 100 L0 100 Z"
            fill="url(#g)"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.path
            d="M0 80 C40 70, 60 40, 100 45 S160 20, 200 28 S230 10, 240 18"
            fill="none"
            stroke="#00e88f"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.text
            x="100"
            y="55"
            fill="#00e88f"
            fontSize="14"
            fontWeight="800"
            animate={{ y: [55, 48, 55], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            B
          </motion.text>
          <motion.text
            x="180"
            y="22"
            fill="#ff3b6b"
            fontSize="14"
            fontWeight="800"
            animate={{ y: [22, 16, 22], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.4 }}
          >
            S
          </motion.text>
        </svg>
        <div className="kf-scanline" />
      </div>
    );
  }
  if (kind === "trade") {
    return (
      <div className="kf-motion-panel relative flex items-center justify-center gap-3 overflow-hidden p-4">
        <motion.div
          className="rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          animate={{ y: [0, -6, 0], boxShadow: ["0 0 0 rgba(0,232,143,0)", "0 0 24px rgba(0,232,143,0.45)", "0 0 0 rgba(0,232,143,0)"] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          Buy ETH
        </motion.div>
        <motion.div
          className="text-[var(--accent)]"
          animate={{ x: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          →
        </motion.div>
        <motion.div
          className="rounded-xl border border-rose-500/60 bg-rose-500/20 px-4 py-3 text-sm font-black text-rose-200"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.3 }}
        >
          Sell ETH
        </motion.div>
        <div className="kf-scanline" />
      </div>
    );
  }
  return (
    <div className="kf-motion-panel relative overflow-hidden p-4">
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <motion.div
          className="h-16 w-16 rounded-2xl border border-[var(--accent)] bg-[var(--accent-dim)]"
          animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="font-mono text-[10px] text-[var(--accent)]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          KingMarginVault
        </motion.div>
        <motion.div
          className="h-1.5 w-28 overflow-hidden rounded-full bg-black/50"
        >
          <motion.div
            className="h-full bg-[var(--accent)]"
            animate={{ width: ["20%", "85%", "40%", "20%"] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
      <div className="kf-scanline" />
    </div>
  );
}

export function HomeExplainer() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--cut)] bg-gradient-to-b from-[#002016] to-[#000b07] px-5 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-10 top-0 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Robinhood Chain · TOKEN/ETH
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Trade memes with{" "}
            <span className="text-[var(--accent)]">ETH</span>
            <span className="block text-xl font-bold text-[var(--muted)] sm:text-2xl">
              Spot swaps · real leverage vault · in-app confirm
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Paste a contract, read the live line chart, buy with ETH or sell for
            ETH. Leverage opens through KingMarginVault — not simulated.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {CTAS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={c.primary ? "king-btn-primary" : "king-btn-ghost"}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">How it works</h2>
            <p className="text-sm text-[var(--muted)]">
              Product flow — animated, not stock footage.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <motion.article
              key={s.n}
              className="kf-panel overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <PanelVisual kind={s.visual} />
              <div className="space-y-1 p-4">
                <div className="text-[10px] font-bold tracking-widest text-[var(--accent)]">
                  {s.n}
                </div>
                <h3 className="text-base font-black">{s.title}</h3>
                <p className="text-sm text-[var(--muted)]">{s.copy}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="kf-panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-black">Ready when you are</h2>
          <p className="text-sm text-[var(--muted)]">
            Connect wallet · confirm in KINGFUN · approve once in wallet.
          </p>
        </div>
        <Link href="/trade" className="king-btn-primary">
          Open Trade
        </Link>
      </section>
    </div>
  );
}
