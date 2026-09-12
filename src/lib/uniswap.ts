/** Uniswap deployments on Robinhood Chain (4663) — verified on-chain + Uniswap/contracts deployments/4663.md */
export const WETH =
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as const;
export const UNISWAP_V2_FACTORY =
  "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f" as const;
export const UNISWAP_V2_ROUTER =
  "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba" as const;
export const UNISWAP_V3_FACTORY =
  "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA" as const;
export const UNISWAP_V3_SWAP_ROUTER =
  "0xCaf681a66D020601342297493863E78C959E5cb2" as const;
export const UNIVERSAL_ROUTER =
  "0x8876789976decbfcbbbe364623c63652db8c0904" as const;
export const PERMIT2 =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
export const V3_FEES = [100, 500, 3000, 10000] as const;

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
] as const;

export const V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
  "function allPairsLength() view returns (uint256)",
] as const;

export const V2_PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
  "event Sync(uint112 reserve0, uint112 reserve1)",
] as const;

export const V2_ROUTER_ABI = [
  "function WETH() view returns (address)",
  "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)",
  "function getAmountsIn(uint amountOut, address[] calldata path) view returns (uint[] memory amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
] as const;

export const V3_FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
] as const;

export const V3_POOL_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
] as const;

export const V3_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) payable returns (uint256 amountOut)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient) payable",
  "function multicall(bytes[] data) payable returns (bytes[] results)",
  "function WETH9() view returns (address)",
] as const;

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function isEthQuote(addr: string): boolean {
  const a = addr.toLowerCase();
  return a === ZERO_ADDR || a === WETH.toLowerCase();
}
