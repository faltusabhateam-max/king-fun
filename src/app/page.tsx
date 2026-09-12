"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Rocket, Compass, Sparkles, Crown } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

export default function HomePage() {
  return (
    <PageTransition>
      <section className="relative flex flex-col items-center text-center">
        <motion.div
          className="relative mb-8 h-36 w-36 sm:h-44 sm:w-44"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-full bg-[#00e88f]/20 blur-3xl animate-pulse-glow" />
          <div className="relative h-full w-full overflow-hidden rounded-full border border-emerald-400/40 shadow-[0_0_50px_rgba(0,232,143,0.35)]">
            <Image
              src="/logo.png"
              alt="king.fun"
              fill
              className="object-cover"
              priority
              sizes="176px"
            />
          </div>
        </motion.div>

        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#00e88f]">
          <Crown size={14} /> KING.FUN Launchpad
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#e8eee9] sm:text-6xl">
          Launch memes into{" "}
          <span className="bg-gradient-to-r from-[#00e88f] to-[#7dffc8] bg-clip-text text-transparent">
            emerald space
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base text-[#e8eee9]/60 sm:text-lg">
          Solana meme launchpad with wallet-signed mints, King Curve trading,
          Jupiter swaps, and creator fees — no seed phrases, ever.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/launch" className="king-btn-primary px-6 py-3 text-base">
            <Rocket size={18} /> Launch
          </Link>
          <Link href="/explore" className="king-btn-ghost px-6 py-3 text-base">
            <Compass size={18} /> Explore
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Real mint flow",
              body: "Create SPL tokens with your wallet signature on Solana mainnet.",
            },
            {
              icon: Rocket,
              title: "King Curve",
              body: "Bonding-curve math ready today; on-chain program deploy needs SOL.",
            },
            {
              icon: Crown,
              title: "Creator fees",
              body: "Set your fee % and track estimated earnings from curve trades.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i }}
              className="king-panel king-glow-card p-5 text-left"
            >
              <f.icon className="mb-3 text-[#00e88f]" size={22} />
              <h3 className="font-semibold text-[#e8eee9]">{f.title}</h3>
              <p className="mt-2 text-sm text-[#e8eee9]/55">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
