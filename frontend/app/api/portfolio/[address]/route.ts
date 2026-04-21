import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ address: string }> }
) {
  const { address } = await ctx.params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const rows = getPortfolio(address);

    const result: Record<
      string,
      {
        avgYesEntry: number;
        avgNoEntry: number;
        totalYesCost: number;
        totalNoCost: number;
      }
    > = {};

    for (const row of rows) {
      result[row.market_id.toString()] = {
        avgYesEntry: row.avg_yes_entry,
        avgNoEntry: row.avg_no_entry,
        totalYesCost: row.yes_cost,
        totalNoCost: row.no_cost,
      };
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portfolio/[address]]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
