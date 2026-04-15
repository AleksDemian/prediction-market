// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

/// @notice Seeds 6 demo markets and places initial trades to show varied prices.
contract Seed is Script {
    uint256 constant SEED_LIQ = 2_000e6; // 2 000 mUSDC per market

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address marketAddr  = vm.envAddress("MARKET_ADDRESS");
        address usdcAddr    = vm.envAddress("USDC_ADDRESS");

        MockUSDC usdc           = MockUSDC(usdcAddr);
        PredictionMarket market = PredictionMarket(marketAddr);
        address deployer        = vm.addr(deployerKey);

        uint64 t = uint64(block.timestamp);

        vm.startBroadcast(deployerKey);

        // ── Mint liquidity for all markets + initial trades ───────────────────
        usdc.mint(deployer, SEED_LIQ * 6 + 2_000e6);
        usdc.approve(marketAddr, type(uint256).max);

        // ── Market 1: Crypto — open 30 days ──────────────────────────────────
        market.createMarket(
            "Will ETH reach $5,000 by July 2026?",
            "Crypto",
            t + 30 days,
            t + 30 days + 1 hours,
            SEED_LIQ
        );

        // ── Market 2: Crypto — open 60 days ──────────────────────────────────
        market.createMarket(
            "Will BTC surpass $150,000 in 2026?",
            "Crypto",
            t + 60 days,
            t + 60 days + 1 hours,
            SEED_LIQ
        );

        // ── Market 3: Sports — open 90 days ──────────────────────────────────
        market.createMarket(
            "Will Argentina win the 2026 FIFA World Cup?",
            "Sports",
            t + 90 days,
            t + 90 days + 1 hours,
            SEED_LIQ
        );

        // ── Market 4: Technology — open 45 days ──────────────────────────────
        market.createMarket(
            "Will GPT-5 be publicly released before Sep 2026?",
            "Technology",
            t + 45 days,
            t + 45 days + 1 hours,
            SEED_LIQ
        );

        // ── Market 5: Finance — open 20 days ─────────────────────────────────
        market.createMarket(
            "Will the Fed cut interest rates in H1 2026?",
            "Finance",
            t + 20 days,
            t + 20 days + 1 hours,
            SEED_LIQ
        );

        // ── Market 6: DEMO market — closes soon, ready to resolve ─────────────
        // Short closing window so the demo guide can resolve it immediately.
        market.createMarket(
            "Will ETH gas fees stay below 10 gwei this week?",
            "Demo",
            t + 1 hours,
            t + 1 hours + 1,  // resolvable almost immediately
            SEED_LIQ
        );

        // ── Seed trades to create interesting price spreads ───────────────────
        market.buyShares(1, true,  200e6, 0); // ETH $5k: lean YES  → p(YES) > 50%
        market.buyShares(2, true,  300e6, 0); // BTC $150k: lean YES
        market.buyShares(3, false, 150e6, 0); // Argentina: lean NO
        market.buyShares(4, true,  100e6, 0); // GPT-5: slight YES
        market.buyShares(5, true,  250e6, 0); // Fed cuts: lean YES
        market.buyShares(6, true,   50e6, 0); // Demo market: slight YES

        vm.stopBroadcast();

        console.log("Seeded 6 markets on PredictionMarket:", marketAddr);
    }
}
