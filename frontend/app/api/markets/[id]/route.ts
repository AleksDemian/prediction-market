import { NextResponse } from "next/server";
import { getMarket } from "@/lib/queries";

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
    const market = getMarket(numId);
    if (!market) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(market);
  } catch (err) {
    console.error("[api/markets/[id]]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
