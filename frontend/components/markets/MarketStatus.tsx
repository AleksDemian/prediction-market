import { Badge } from "@/components/ui/Badge";
import { Outcome, type MarketInfo } from "@/types/market";

interface MarketStatusProps {
  market: MarketInfo;
}

export function MarketStatus({ market }: MarketStatusProps) {
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (market.resolved) {
    if (market.outcome === Outcome.YES) return <Badge variant="resolved-yes">Resolved: YES</Badge>;
    if (market.outcome === Outcome.NO)  return <Badge variant="resolved-no">Resolved: NO</Badge>;
    return <Badge variant="default">Resolved</Badge>;
  }

  if (now >= market.closingTime) return <Badge variant="closed">Closed</Badge>;

  if (market.category === "Demo") return <Badge variant="demo">Demo</Badge>;

  return <Badge variant="open">Open</Badge>;
}
