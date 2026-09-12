"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/launch", label: "Launch" },
  { href: "/explore", label: "Explore" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/fees", label: "Fees" },
  { href: "/settings", label: "Settings" },
];

export function FloatingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex justify-center px-3 pt-4 sm:px-4">
      <nav className="king-glass relative flex w-full max-w-5xl items-center gap-2 rounded-full border border-emerald-400/20 px-2 py-1.5 shadow-[0_0_40px_rgba(0,232,143,0.12)] backdrop-blur-xl sm:gap-3 sm:px-3">
        <Link href="/" className="relative shrink-0" onClick={() => setOpen(false)}>
          <motion.div
            className="relative h-11 w-11 overflow-hidden rounded-full border border-emerald-400/40 shadow-[0_0_20px_rgba(0,232,143,0.45)] sm:h-12 sm:w-12"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/logo.png"
              alt="king.fun"
              fill
              className="object-cover"
              sizes="48px"
              priority
            />
          </motion.div>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {LINKS.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition xl:px-3 xl:text-sm ${
                  active
                    ? "bg-emerald-400/15 text-[#00e88f] shadow-[0_0_12px_rgba(0,232,143,0.25)]"
                    : "text-[#e8eee9]/80 hover:bg-white/5 hover:text-[#00e88f]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            type="button"
            className="rounded-full border border-emerald-400/20 p-2 text-[#e8eee9] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#0a1f16]/95 p-3 shadow-xl backdrop-blur-xl lg:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm ${
                  pathname === l.href
                    ? "bg-emerald-400/15 text-[#00e88f]"
                    : "text-[#e8eee9]/90"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-emerald-400/10 pt-2 sm:hidden">
              <WalletButton className="w-full" />
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  );
}
