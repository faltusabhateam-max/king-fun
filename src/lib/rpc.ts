import { JsonRpcProvider } from "ethers";
import { ROBINHOOD_RPC } from "./robinhood";

let provider: JsonRpcProvider | null = null;

export function getRpc(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(ROBINHOOD_RPC, 4663, {
      staticNetwork: true,
    });
  }
  return provider;
}
