import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const markets = getMarkets();
    return NextResponse.json(markets);
  } catch (err) {
    console.error("[api/markets]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
