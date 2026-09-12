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
      marginVault,
      deployer,
      createFeeWei,
      platformFeeBps,
      platformTreasury,
      txHash,
      chainId,
    } = body;

    const existing = await getDeployments();

    const nextFactory =
      factoryAddress && /^0x[a-fA-F0-9]{40}$/.test(factoryAddress)
        ? factoryAddress
        : existing.factoryAddress || "";

    const nextVault =
      marginVault && /^0x[a-fA-F0-9]{40}$/.test(marginVault)
        ? marginVault
        : existing.marginVault;

    if (!nextFactory && !nextVault) {
      return NextResponse.json(
        { error: "Valid factoryAddress or marginVault (0x…) required" },
        { status: 400 }
      );
    }

    const isVaultOnly = Boolean(marginVault && !factoryAddress);

    const state: DeploymentsState = {
      factoryAddress: nextFactory,
      marginVault: nextVault,
      deployer: deployer || existing.deployer,
      createFeeWei: createFeeWei
        ? String(createFeeWei)
        : existing.createFeeWei,
      platformFeeBps:
        platformFeeBps != null
          ? Number(platformFeeBps)
          : existing.platformFeeBps,
      platformTreasury: platformTreasury || existing.platformTreasury,
      chainId: Number(chainId) || existing.chainId || ROBINHOOD_CHAIN_ID,
      txHash: txHash || (isVaultOnly ? existing.txHash : txHash) || existing.txHash,
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
