/**
 * King Curve — constant-product bonding curve math + IDL placeholder.
 *
 * ON-CHAIN STATUS:
 * - Curve math below is used client-side for quotes and local trade accounting
 *   until the King Curve Solana program is deployed.
 * - Real SPL mint creation is wallet-signed on day one (see mint-tx.ts).
 * - Deploying the bonding-curve program requires SOL for rent + deploy fees.
 *
 * IDL placeholder for future Anchor program integration.
 */

export const KING_CURVE_IDL = {
  version: "0.1.0",
  name: "king_curve",
  address: "KingCurve1111111111111111111111111111111111",
  instructions: [
    {
      name: "initialize_curve",
      accounts: [
        { name: "curve", isMut: true, isSigner: false },
        { name: "mint", isMut: true, isSigner: false },
        { name: "creator", isMut: true, isSigner: true },
      ],
      args: [
        { name: "creator_fee_bps", type: "u16" },
        { name: "name", type: "string" },
        { name: "symbol", type: "string" },
        { name: "uri", type: "string" },
      ],
    },
    {
      name: "buy",
      accounts: [
        { name: "curve", isMut: true, isSigner: false },
        { name: "buyer", isMut: true, isSigner: true },
      ],
      args: [
        { name: "sol_in", type: "u64" },
        { name: "min_tokens_out", type: "u64" },
      ],
    },
    {
      name: "sell",
      accounts: [
        { name: "curve", isMut: true, isSigner: false },
        { name: "seller", isMut: true, isSigner: true },
      ],
      args: [
        { name: "tokens_in", type: "u64" },
        { name: "min_sol_out", type: "u64" },
      ],
    },
  ],
} as const;

/** Default virtual reserves (~ pump.fun style seeding) */
export const DEFAULT_VIRTUAL_SOL = 30; // SOL
export const DEFAULT_VIRTUAL_TOKENS = 1_073_000_000; // tokens
export const DEFAULT_REAL_TOKEN_RESERVES = 793_100_000;
export const GRADUATION_SOL = 85; // SOL into curve → graduate

export interface CurveState {
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realSolReserves: number;
  realTokenReserves: number;
}

export function initialCurveState(): CurveState {
  return {
    virtualSolReserves: DEFAULT_VIRTUAL_SOL,
    virtualTokenReserves: DEFAULT_VIRTUAL_TOKENS,
    realSolReserves: 0,
    realTokenReserves: DEFAULT_REAL_TOKEN_RESERVES,
  };
}

export function spotPriceSol(state: CurveState): number {
  if (state.virtualTokenReserves <= 0) return 0;
  return state.virtualSolReserves / state.virtualTokenReserves;
}

/** Buy tokens with SOL (constant product) */
export function quoteBuy(
  state: CurveState,
  solIn: number,
  feeBps: number
): { tokensOut: number; creatorFeeSol: number; newState: CurveState; priceImpact: number } {
  const creatorFeeSol = (solIn * feeBps) / 10_000;
  const solToCurve = solIn - creatorFeeSol;
  if (solToCurve <= 0) {
    return { tokensOut: 0, creatorFeeSol: 0, newState: state, priceImpact: 0 };
  }

  const k = state.virtualSolReserves * state.virtualTokenReserves;
  const newVirtualSol = state.virtualSolReserves + solToCurve;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = Math.min(
    state.virtualTokenReserves - newVirtualTokens,
    state.realTokenReserves
  );

  const priceBefore = spotPriceSol(state);
  const newState: CurveState = {
    virtualSolReserves: newVirtualSol,
    virtualTokenReserves: state.virtualTokenReserves - tokensOut,
    realSolReserves: state.realSolReserves + solToCurve,
    realTokenReserves: state.realTokenReserves - tokensOut,
  };
  const priceAfter = spotPriceSol(newState);
  const priceImpact = priceBefore > 0 ? ((priceAfter - priceBefore) / priceBefore) * 100 : 0;

  return { tokensOut, creatorFeeSol, newState, priceImpact };
}

/** Sell tokens for SOL */
export function quoteSell(
  state: CurveState,
  tokensIn: number,
  feeBps: number
): { solOut: number; creatorFeeSol: number; newState: CurveState; priceImpact: number } {
  if (tokensIn <= 0) {
    return { solOut: 0, creatorFeeSol: 0, newState: state, priceImpact: 0 };
  }

  const k = state.virtualSolReserves * state.virtualTokenReserves;
  const newVirtualTokens = state.virtualTokenReserves + tokensIn;
  const newVirtualSol = k / newVirtualTokens;
  const solGross = state.virtualSolReserves - newVirtualSol;
  const capped = Math.min(solGross, state.realSolReserves);
  const creatorFeeSol = (capped * feeBps) / 10_000;
  const solOut = capped - creatorFeeSol;

  const priceBefore = spotPriceSol(state);
  const newState: CurveState = {
    virtualSolReserves: state.virtualSolReserves - capped,
    virtualTokenReserves: newVirtualTokens,
    realSolReserves: state.realSolReserves - capped,
    realTokenReserves: state.realTokenReserves + tokensIn,
  };
  const priceAfter = spotPriceSol(newState);
  const priceImpact = priceBefore > 0 ? ((priceAfter - priceBefore) / priceBefore) * 100 : 0;

  return { solOut, creatorFeeSol, newState, priceImpact };
}

export function isGraduated(state: CurveState): boolean {
  return state.realSolReserves >= GRADUATION_SOL;
}
