"use client";

import { useSyncExternalStore } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { usePriceHistory } from "@/hooks/usePriceHistory";

interface PriceChartProps {
  marketId: bigint;
}

function formatXAxis(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return format(d, "HH:mm");
  }
  return format(d, "MMM d");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const prob = (point.probability * 100).toFixed(1);
  const date = format(new Date(point.timestamp * 1000), "MMM d, HH:mm");
  return (
    <div className="bg-navy-800 border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-brand font-semibold">{prob}% YES</p>
      <p className="text-text-muted">{date}</p>
    </div>
  );
}

// Recharts `ResponsiveContainer` measures DOM and breaks SSR — we render the
// skeleton until hydration. `useSyncExternalStore` is the React 19 idiom for
// "am I on the client yet" without causing an extra render from a setState.
const subscribe = () => () => {};
const useIsMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

export function PriceChart({ marketId }: PriceChartProps) {
  const mounted = useIsMounted();

  const { data: points, isLoading } = usePriceHistory(marketId);

  if (!mounted || isLoading) {
    return (
      <div className="h-52 bg-navy-800/50 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-text-muted text-xs">Loading chart...</span>
      </div>
    );
  }

  if (!points || points.length < 2) {
    return (
      <div className="h-52 bg-navy-800/30 rounded-xl flex items-center justify-center border border-border">
        <span className="text-text-muted text-xs">No trade history yet</span>
      </div>
    );
  }

  const chartData = points.map((p) => ({
    timestamp: p.timestamp,
    probability: p.probability,
  }));

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%" minHeight={208}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#bcfb9f" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#bcfb9f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatXAxis}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0.5}
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="probability"
            stroke="#bcfb9f"
            strokeWidth={2}
            fill="url(#yesGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#bcfb9f", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
