import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg kf-panel space-y-3 p-6">
      <h1 className="text-lg font-black">Settings</h1>
      <p className="text-sm text-[var(--muted)]">
        Chain is fixed to Robinhood (4663). Quote asset is ETH only. Wallet
        connection via Reown / WalletConnect.
      </p>
      <Link href="/" className="king-btn-primary inline-flex">
        Trade
      </Link>
    </div>
  );
}
