# king.fun — Solana Meme Launchpad

**KING.FUN Launchpad** is a premium Solana meme launchpad with deep-space emerald + chrome branding. Launch tokens, explore DexScreener memes, trade via Jupiter or King Curve, and track creator fees.

> Not affiliated with DipCatcher or any trading-bot brand.

## Features

- **WalletConnect / Reown AppKit** (Solana) — connect Phantom, Solflare, and WalletConnect wallets
- **Launch** — form + **real SPL mint** creation signed by the user’s wallet (`@solana/web3.js` + `@solana/spl-token`)
- **King Curve** — constant-product bonding-curve math + IDL placeholder; local curve state until the on-chain program is deployed
- **Explore** — DexScreener Solana boosted/meme pairs + local launches
- **Token page** — lightweight-charts + GeckoTerminal/DexScreener OHLCV, Buy/Sell (Jupiter or curve), trade feed, creator fee
- **Portfolio** — live SOL + SPL balances from public RPC (shows 0 if empty)
- **Creator fees** — fee % + estimated earnings from stored trades
- Animated starfield, floating glass nav, Framer Motion transitions

## What’s real on day one

| Capability | Status |
|---|---|
| Wallet connect (Reown AppKit) | ✅ Real |
| SPL token mint (wallet-signed) | ✅ Real on-chain |
| DexScreener explore / logos / liquidity | ✅ Real API |
| Jupiter quote + swap (listed tokens) | ✅ Real API + wallet sign |
| Portfolio balances | ✅ Real RPC |
| Chart OHLCV (GeckoTerminal / DexScreener pools) | ✅ Real when pool exists |
| King Curve buy/sell settlement | ⚠️ Client math + local JSON state; **on-chain program not deployed yet** |
| Metaplex metadata account | ⚠️ URI stored in launch record; full metadata ix can be added post-deploy |

Deploying the **King Curve** Solana program requires **SOL** for rent and deploy fees. Until then, curve trades update local state under `data/` and may request a wallet message signature for intent.

**king.fun never collects seed phrases.**

## Stack

- Next.js App Router · TypeScript · Tailwind CSS v4
- Framer Motion · lightweight-charts · lucide-react
- Reown AppKit (`@reown/appkit` + `@reown/appkit-adapter-solana`)
- `@solana/web3.js` · `@solana/spl-token`

## Setup

```bash
cd /workspace/king-fun
cp .env.example .env.local
# set NEXT_PUBLIC_PROJECT_ID / NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID from https://dashboard.reown.com
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Reown / WalletConnect Cloud project ID |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | Same ID (alias) |
| `NEXT_PUBLIC_SOLANA_RPC` | No | RPC URL (default mainnet-beta; use Helius for production) |
| `NEXT_PUBLIC_APP_URL` | No | Public site URL for metadata / WC verify |

## Scripts

```bash
npm run dev      # development
npm run build    # production build
npm start        # serve build
```

## Deploy (Vercel)

- `vercel.json` included
- Set the env vars in the Vercel project dashboard
- Persist `data/launches.json` & `data/trades.json` with a volume, Blob store, or DB for multi-instance production (filesystem is fine for single-node / demo)

```bash
npx vercel --prod
```

## Brand

- Name: **king.fun** / KING.FUN Launchpad
- Colors: bg `#000f0a`–`#001a10`, panels `#0a1f16/80`, accent `#00e88f`, silver `#e8eee9`
- Assets: `public/logo.png`, `public/icon-512.png`, `public/og-banner.png`

## License

Private — king.fun
