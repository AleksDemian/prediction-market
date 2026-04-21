import MarketsClientPage from "./_components/MarketsClientPage";
import { getMarkets } from "@/lib/queries";
import type { MarketRow } from "@/lib/queries";

export default async function HomePage() {
  let initialMarkets: MarketRow[] | undefined;
  try {
    initialMarkets = getMarkets();
  } catch {
    // DB not yet available (first start, dev without Docker); client will fetch
  }

  return <MarketsClientPage initialMarkets={initialMarkets} />;
}
