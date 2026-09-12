import { NextRequest, NextResponse } from "next/server";
import { getDeployments, saveDeployments } from "@/lib/collections-store";
import type { DeploymentsState } from "@/lib/types";
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhood";

export const runtime = "nodejs";

export async function GET() {
  const deployments = await getDeployments();
  return NextResponse.json({ deployments });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      factoryAddress,
      deployer,
      createFeeWei,
      platformFeeBps,
      platformTreasury,
      txHash,
      chainId,
    } = body;

    if (!factoryAddress || !/^0x[a-fA-F0-9]{40}$/.test(factoryAddress)) {
      return NextResponse.json(
        { error: "Valid factoryAddress (0x…) required" },
        { status: 400 }
      );
    }

    const state: DeploymentsState = {
      factoryAddress,
      deployer: deployer || undefined,
      createFeeWei: createFeeWei ? String(createFeeWei) : undefined,
      platformFeeBps:
        platformFeeBps != null ? Number(platformFeeBps) : undefined,
      platformTreasury: platformTreasury || undefined,
      chainId: Number(chainId) || ROBINHOOD_CHAIN_ID,
      txHash: txHash || undefined,
      deployedAt: Date.now(),
    };

    await saveDeployments(state);
    return NextResponse.json({ deployments: state }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save" },
      { status: 500 }
    );
  }
}
