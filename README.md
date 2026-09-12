# KINGFUN TRADING APP

Robinhood Chain–only **TOKEN/ETH** trading terminal. Real wallet swaps on Uniswap. Live funds only.

- Chain ID **4663** · RPC `https://rpc.mainnet.chain.robinhood.com`
- Uniswap V2 Router `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba`
- WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
- Live: https://kingfun-live.vercel.app

## Real vs blocked

| Feature | Status |
|---|---|
| Connect wallet (4663) | Real |
| Paste CA → ERC20 + TOKEN/ETH pool | Real (V2/V3) |
| Spot buy/sell ETH | Real signed Uniswap txs |
| Charts | Real V2 Swap logs (V3 mark-only) |
| Discover | DexScreener when available |
| Portfolio balances | Real RPC |
| Leverage ≤50x | Contract `KingMarginVault.sol` — deploy + seed required |
| Whales / smart money | Needs indexer — not available |

Not affiliated with Robinhood Markets, Inc.
