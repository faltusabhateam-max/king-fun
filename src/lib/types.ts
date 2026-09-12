export type LaunchStatus = "curve" | "graduated" | "listed";

export interface LaunchRecord {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  mint: string;
  creator: string;
  creatorFeeBps: number;
  createdAt: number;
  status: LaunchStatus;
  decimals: number;
  supply: number;
  /** King Curve virtual reserves (SOL lamports + tokens) */
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realSolReserves: number;
  realTokenReserves: number;
  metadataUri?: string;
  signature?: string;
  onChainMint: boolean;
}

export interface TradeRecord {
  id: string;
  mint: string;
  side: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  priceSol: number;
  trader: string;
  creatorFeeSol: number;
  timestamp: number;
  signature?: string;
  simulated?: boolean;
}

export interface ExploreToken {
  address: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  priceUsd?: number;
  liquidityUsd?: number;
  volume24h?: number;
  priceChange24h?: number;
  pairAddress?: string;
  dexId?: string;
  url?: string;
  source: "local" | "dexscreener";
  creatorFeeBps?: number;
}
