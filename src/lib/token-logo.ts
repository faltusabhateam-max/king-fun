/** Best-effort token logo URLs (no guarantee). Fallback to letter avatar in UI. */
export function tokenLogoCandidates(ca: string): string[] {
  const a = ca.toLowerCase();
  return [
    `https://robinhoodchain.blockscout.com/token/images/${a}`,
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumHint(ca)}/logo.png`,
    `https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/${checksumHint(ca)}/logo.png`,
  ];
}

/** Soft checksum-ish path many lists use (EIP-55 not required for try). */
function checksumHint(ca: string): string {
  if (!ca.startsWith("0x") || ca.length !== 42) return ca;
  // TrustWallet paths are checksummed; try both raw and uppercase mid as fallbacks elsewhere
  return ca;
}

export function letterAvatarDataUrl(symbol: string, seed: string): string {
  const letter = (symbol || seed || "?").replace(/^0x/, "").slice(0, 1).toUpperCase();
  const hue =
    Math.abs(
      [...(seed || letter)].reduce((a, c) => a + c.charCodeAt(0), 0)
    ) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="hsl(${hue} 70% 18%)"/>
  <text x="50%" y="54%" text-anchor="middle" font-family="system-ui" font-size="28" font-weight="800" fill="#00e88f">${letter}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
