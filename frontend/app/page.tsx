import { MarketList } from "@/components/markets/MarketList";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Prediction Markets</h1>
        <p className="text-accent-dim text-sm">
          Trade YES/NO shares on real-world outcomes · Powered by constant-product AMM · Sepolia testnet
        </p>
      </div>

      <MarketList />
    </div>
  );
}
