import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RESOLVE_ABI = parseAbi([
  "function forceResolveMarket(uint256 marketId, uint8 outcome) external",
]);

export async function POST(req: NextRequest) {
  try {
    const { marketId, outcome } = await req.json();
    if (marketId === undefined || outcome === undefined) {
      return NextResponse.json({ error: "Missing marketId or outcome" }, { status: 400 });
    }
    // outcome: 1=YES, 2=NO, 3=INVALID
    if (![1, 2, 3].includes(Number(outcome))) {
      return NextResponse.json({ error: "Invalid outcome (use 1=YES, 2=NO, 3=INVALID)" }, { status: 400 });
    }

    const privateKey     = process.env.DEMO_ADMIN_PRIVATE_KEY as `0x${string}`;
    const marketAddress  = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;
    const rpcUrl         = process.env.NEXT_PUBLIC_RPC_URL;

    if (!privateKey || !marketAddress) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const account    = privateKeyToAccount(privateKey);
    const transport  = rpcUrl ? http(rpcUrl) : http();
    const walletClient = createWalletClient({ account, chain: sepolia, transport });

    const hash = await walletClient.writeContract({
      address: marketAddress,
      abi: RESOLVE_ABI,
      functionName: "forceResolveMarket",
      args: [BigInt(marketId), Number(outcome)],
    });

    return NextResponse.json({ hash, marketId, outcome });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
