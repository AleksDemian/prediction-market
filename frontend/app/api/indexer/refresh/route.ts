import { NextResponse } from "next/server";

const MIN_REFRESH_INTERVAL_MS = 10_000;
// Process-local throttle is sufficient for this long-running Docker deployment.
let lastRefreshAt = 0;

export async function POST() {
  const refreshUrl = process.env.INDEXER_REFRESH_URL;

  if (!refreshUrl) {
    return NextResponse.json({ status: "skipped" }, { status: 202 });
  }

  const now = Date.now();
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
    return NextResponse.json({ status: "throttled" }, { status: 202 });
  }
  lastRefreshAt = now;

  try {
    const res = await fetch(refreshUrl, {
      method: "POST",
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { status: "failed", upstreamStatus: res.status },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 502 });
  }

  return NextResponse.json({ status: "scheduled" }, { status: 202 });
}
