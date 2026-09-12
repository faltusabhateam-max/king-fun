# king.fun — NFT Launchpad on Robinhood Chain

**KING.FUN Launchpad** is a premium NFT launchpad with deep-space emerald branding, running on **Robinhood Chain Mainnet** (Chain ID **4663**).

> Not affiliated with Robinhood Markets, Inc. beyond using the public Robinhood Chain network.

## Network

| Field | Value |
|---|---|
| Name | Robinhood Chain Mainnet |
| Chain ID | **4663** (`0x1237`) |
| RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |
| Currency | ETH |

## Platform earnings (on-chain)

Fees are **pushed** to the treasury on each transaction (no custody):

1. **createFee** — paid when a creator calls `factory.createCollection`; **100%** sent to `platformTreasury`.
2. **platformFeeBps** — on every `collection.mint`, that % of mint payment goes to `platformTreasury`; remainder goes to the **creator**.
3. Factory tracks `totalCreateFeesEth`, `totalPlatformFeesEth`, `totalVolumeEth`. Each collection tracks its own volume / fees.
4. Owner can `setCreateFee`, `setDefaultPlatformFeeBps`, `setPlatformTreasury`, `withdrawStuckETH` (rescue only).

Default UI suggestions: `createFee = 0.0001 ETH`, `defaultPlatformFeeBps = 250` (2.5%).

## How to deploy the factory (user signs — no private keys)

1. Fund your wallet with a little **ETH on Robinhood Chain** (~**$5** is plenty; gas is cheap).
2. Open **`/deploy`**, connect wallet (Reown / WalletConnect).
3. Confirm you are on chain **4663** (the page calls `wallet_switchEthereumChain` / `wallet_addEthereumChain`).
4. Set **platform treasury** (defaults to your address), **createFee**, and **platformFeeBps**.
5. Review the gas estimate, then click **Deploy Factory** and **confirm in your wallet**.
6. On success the address is saved to `data/deployments.json` and `public/deployments/robinhood.json`, with an explorer link shown.
7. Optionally paste an existing factory in **Settings**.

**king.fun never collects seed phrases or private keys.**

## Features

- **Deploy** — wallet-signed Hardhat artifact deploy of `KingNFTFactory`
- **Launch** — `createCollection` (user signs) → new `KingNFTCollection` owned by creator
- **Explore / Collection** — mint UI, supply, price, activity
- **Portfolio** — ERC721 `balanceOf` / `tokenOfOwnerByIndex` via public RH RPC
- **Fees** — treasury, createFee, bps, on-chain volume/fee stats + creator earnings
- Emerald space theme, floating nav, logo + og-banner

## Contracts

Solidity **0.8.20+**, OpenZeppelin 4.9, Hardhat:

- `contracts/KingNFTCollection.sol` — ERC721Enumerable + Ownable + ReentrancyGuard + Pausable
- `contracts/KingNFTFactory.sol` — deploys collections, indexes them, platform fee config

```bash
npx hardhat compile
# ABI + bytecode exported to src/lib/abi/KingNFTFactory.json & KingNFTCollection.json
```

## Setup

```bash
cd /workspace/king-fun
cp .env.example .env.local
# set NEXT_PUBLIC_PROJECT_ID from https://dashboard.reown.com
npm install
npm run compile   # optional: recompile contracts + export ABIs
npm run dev
```

### Environment

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Reown / WalletConnect Cloud project ID |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | Same ID (alias) |
| `NEXT_PUBLIC_ROBINHOOD_RPC` | No | Default public RH RPC |
| `NEXT_PUBLIC_APP_URL` | No | Public site URL for metadata / WC verify |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | No | Optional pre-set factory |

## Scripts

```bash
npm run compile  # hardhat compile + export ABIs
npm run dev
npm run build
npm start
```

## Gas guidance

- Factory deploy: typically low six-figure gas on RH Chain; cost is usually a small fraction of a cent–few cents depending on ETH price and gas.
- Keep ~**$5 of ETH** on Robinhood Chain for deploy + several launches/mints.
- Exact estimate is shown on `/deploy` from `estimateGas` × current fee data.

## Deploy (Vercel)

```bash
npx vercel --prod
```

Set Reown env vars in the Vercel dashboard. Persist `data/*.json` (volume / Blob / DB) for multi-instance production.

## Brand

- Name: **king.fun** / KING.FUN Launchpad
- Colors: bg `#000f0a`–`#001a10`, panels `#0a1f16/80`, accent `#00e88f`, silver `#e8eee9`
- Assets: `public/logo.png`, `public/icon-512.png`, `public/og-banner.png`

## License

Private — king.fun
