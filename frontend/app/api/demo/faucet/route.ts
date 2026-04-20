import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const MINT_ABI = parseAbi([
  "function mint(address to, uint256 amount) external",
]);

const AMOUNT = BigInt(1_000 * 10 ** 6); // 1 000 mUSDC

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const privateKey = process.env.DEMO_ADMIN_PRIVATE_KEY as `0x${string}`;
    const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

    if (!privateKey || !usdcAddress) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);
    const transport = rpcUrl ? http(rpcUrl) : http();

    const walletClient = createWalletClient({ account, chain: sepolia, transport });

    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: MINT_ABI,
      functionName: "mint",
      args: [address as `0x${string}`, AMOUNT],
    });

    return NextResponse.json({ hash, amount: AMOUNT.toString() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
