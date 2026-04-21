import MarketDetailClientPage from "@/app/_components/MarketDetailClientPage";
import { getMarket } from "@/lib/queries";
import type { MarketRow } from "@/lib/queries";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  let initialMarket: MarketRow | undefined;
  if (!isNaN(numId)) {
    try {
      initialMarket = getMarket(numId);
    } catch {
      // DB not yet available; client will fetch
    }
  }

  return <MarketDetailClientPage id={id} initialMarket={initialMarket} />;
}
