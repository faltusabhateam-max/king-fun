export function shortAddr(addr: string, n = 4): string {
  if (!addr) return "";
  if (addr.length <= n * 2 + 2) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function formatUsd(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

export function formatSol(n?: number | null, digits = 4): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)} SOL`;
}

export function formatPct(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatNumber(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}
