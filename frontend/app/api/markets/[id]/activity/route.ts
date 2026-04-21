import { NextResponse } from "next/server";
import { getActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = isNaN(rawLimit) ? 50 : Math.min(rawLimit, 200);

  try {
    const events = getActivity(numId, limit);
    return NextResponse.json(events);
  } catch (err) {
    console.error("[api/markets/[id]/activity]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
