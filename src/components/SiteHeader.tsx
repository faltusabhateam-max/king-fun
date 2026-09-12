"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/launch", label: "Launch" },
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "About" },
  { href: "/fees", label: "Fees" },
];

const X_URL = "https://x.com/Crypto_King877";
const TG_URL = "https://t.me/crypto_king887";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="paper-header sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-black tracking-tight text-[var(--ink)]"
          onClick={() => setOpen(false)}
        >
          <span className="paper-brand">king</span>
          <span className="text-[var(--accent)]">.fun</span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`paper-nav-link ${active ? "is-active" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="X"
            className="paper-icon-btn hidden sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.527-8.615L1.882 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href={TG_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Telegram"
            className="paper-icon-btn hidden sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            type="button"
            className="paper-icon-btn md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--cut)] bg-[var(--paper-deep)] px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${
                pathname === l.href
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--ink)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-[var(--cut)] pt-3">
            <a href={X_URL} target="_blank" rel="noreferrer" className="paper-icon-btn">
              X
            </a>
            <a href={TG_URL} target="_blank" rel="noreferrer" className="paper-icon-btn">
              TG
            </a>
            <WalletButton className="ml-auto" />
          </div>
        </div>
      )}
    </header>
  );
}
