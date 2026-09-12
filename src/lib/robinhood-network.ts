"use client";

import { defineChain } from "@reown/appkit/networks";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC,
  ROBINHOOD_EXPLORER,
} from "./robinhood";

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  caipNetworkId: `eip155:${ROBINHOOD_CHAIN_ID}`,
  chainNamespace: "eip155",
  name: "Robinhood Chain Mainnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: ROBINHOOD_EXPLORER,
      apiUrl: `${ROBINHOOD_EXPLORER}/api`,
    },
  },
});
