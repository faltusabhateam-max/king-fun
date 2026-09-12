/** Robinhood Chain Mainnet — KINGFUN token/ETH trading */
export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_CHAIN_ID_HEX = "0x1237";

export const ROBINHOOD_RPC =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC ||
  "https://rpc.mainnet.chain.robinhood.com";

export const ROBINHOOD_EXPLORER =
  process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER ||
  "https://robinhoodchain.blockscout.com";

export const robinhoodWalletAddParams = {
  chainId: ROBINHOOD_CHAIN_ID_HEX,
  chainName: "Robinhood Chain Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [ROBINHOOD_RPC],
  blockExplorerUrls: [ROBINHOOD_EXPLORER],
};

/** Deployed KingMarginVault on Robinhood Chain (baked fallback). */
export const DEPLOYED_MARGIN_VAULT =
  "0xb479De416fe30D187C1Dc2f6FDa023D2752b60e2" as const;

export const ADDRESSES = {
  factory:
    process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
    ("0x4D3d766dDa77FA43587ECcdB16F5CCAEf4b158be" as `0x${string}`),
  /** Prefer NEXT_PUBLIC_MARGIN_VAULT; fall back to deployed vault. */
  marginVault:
    process.env.NEXT_PUBLIC_MARGIN_VAULT || DEPLOYED_MARGIN_VAULT,
};

export function explorerAddress(addr: string): string {
  return `${ROBINHOOD_EXPLORER}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${ROBINHOOD_EXPLORER}/tx/${hash}`;
}

export const DEFAULT_CREATE_FEE_ETH = "0.0001";
export const DEFAULT_PLATFORM_FEE_BPS = 250;
