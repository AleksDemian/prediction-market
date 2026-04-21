import { NextResponse } from "next/server";
import { getPrices } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const prices = getPrices(numId);
    return NextResponse.json(prices);
  } catch (err) {
    console.error("[api/markets/[id]/prices]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
