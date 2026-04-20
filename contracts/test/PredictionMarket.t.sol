// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    MockUSDC         internal usdc;
    PredictionMarket internal market;

    address internal admin  = makeAddr("admin");
    address internal alice  = makeAddr("alice");
    address internal bob    = makeAddr("bob");

    uint256 constant SEED   = 2_000e6;
    uint256 constant TRADE  = 100e6;

    // ── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.warp(1 days); // avoid timestamp=1 edge case in faucet rate-limit
        vm.startPrank(admin);
        usdc   = new MockUSDC(admin);
        market = new PredictionMarket(address(usdc), admin);

        // Fund admin + users
        usdc.mint(admin,  SEED * 10);
        usdc.mint(alice,  1_000e6);
        usdc.mint(bob,    1_000e6);

        usdc.approve(address(market), type(uint256).max);
        vm.stopPrank();

        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(market), type(uint256).max);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _createMarket() internal returns (uint256 marketId) {
        vm.prank(admin);
        marketId = market.createMarket(
            "Will ETH reach $5,000?",
            "Crypto",
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            SEED
        );
    }

    // ── Market creation ──────────────────────────────────────────────────────

    function test_CreateMarket() public {
        uint256 id = _createMarket();
        assertEq(id, 1);

        (PredictionMarket.MarketInfo memory info, PredictionMarket.Pool memory pool) =
            market.getMarket(id);

        assertEq(info.id, 1);
        assertEq(info.resolved, false);
        assertEq(uint8(info.outcome), uint8(PredictionMarket.Outcome.UNRESOLVED));
        assertEq(pool.yesReserve, SEED);
        assertEq(pool.noReserve,  SEED);
        assertEq(pool.totalCollateral, SEED);
    }

    function test_CreateMarket_OnlyAdmin() public {
        vm.expectRevert("Not admin");
        vm.prank(alice);
        market.createMarket(
            "Q", "C",
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            SEED
        );
    }

    function test_InitialProbability50pct() public {
        uint256 id = _createMarket();
        uint256 prob = market.getYesProbability(id);
        assertEq(prob, 0.5e18);
    }

    // ── Buying shares ─────────────────────────────────────────────────────────

    function test_BuyYesShares() public {
        uint256 id = _createMarket();

        uint256 balBefore = usdc.balanceOf(alice);
        (uint256 expectedShares,) = market.getSharesOut(id, true, TRADE);

        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);

        uint256 balAfter = usdc.balanceOf(alice);
        assertEq(balBefore - balAfter, TRADE);

        PredictionMarket.Position memory pos = market.getUserPosition(id, alice);
        assertEq(pos.yesShares, expectedShares);
        assertEq(pos.noShares,  0);
    }

    function test_BuyNoShares() public {
        uint256 id = _createMarket();
        (uint256 expectedShares,) = market.getSharesOut(id, false, TRADE);

        vm.prank(alice);
        market.buyShares(id, false, TRADE, 0);

        PredictionMarket.Position memory pos = market.getUserPosition(id, alice);
        assertEq(pos.noShares,  expectedShares);
        assertEq(pos.yesShares, 0);
    }

    function test_BuyShiftsPrice() public {
        uint256 id   = _createMarket();
        uint256 p0   = market.getYesProbability(id);  // 0.5e18

        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);  // buy YES → YES price rises

        uint256 p1 = market.getYesProbability(id);
        assertGt(p1, p0);
    }

    function test_BuyAtFiftyPercent_GetsMoreSharesThanNetCollateral() public {
        uint256 id = _createMarket();
        uint256 tenDollars = 10e6;
        (uint256 sharesOut, uint256 fee) = market.getSharesOut(id, true, tenDollars);

        // With YES/NO around 50%, 1 share costs ~0.5 mUSDC, so sharesOut should
        // exceed net collateral spent (after fee).
        uint256 netIn = tenDollars - fee;
        assertGt(sharesOut, netIn);
    }

    function test_BuyShares_SlippageReverts() public {
        uint256 id = _createMarket();
        (uint256 expectedShares,) = market.getSharesOut(id, true, TRADE);

        vm.expectRevert("Slippage exceeded");
        vm.prank(alice);
        market.buyShares(id, true, TRADE, expectedShares + 1);
    }

    function test_BuyShares_BelowMin() public {
        uint256 id = _createMarket();
        vm.expectRevert("Below minimum trade");
        vm.prank(alice);
        market.buyShares(id, true, 0.5e6, 0);
    }

    // ── Selling shares ────────────────────────────────────────────────────────

    function test_SellYesShares() public {
        uint256 id = _createMarket();

        vm.startPrank(alice);
        market.buyShares(id, true, TRADE, 0);
        PredictionMarket.Position memory posAfterBuy = market.getUserPosition(id, alice);
        uint256 sharesToSell = posAfterBuy.yesShares;

        uint256 balBefore = usdc.balanceOf(alice);
        market.sellShares(id, true, sharesToSell, 0);
        uint256 balAfter = usdc.balanceOf(alice);
        vm.stopPrank();

        // Should receive less than TRADE (2% fee on buy + 2% fee on sell)
        assertGt(balAfter, balBefore);
        assertLt(balAfter - balBefore, TRADE);

        PredictionMarket.Position memory posFinal = market.getUserPosition(id, alice);
        assertEq(posFinal.yesShares, 0);
    }

    function test_BuyForceResolveClaim_WinnerReceivesMoreThanStakeNearFiftyPct() public {
        uint256 id = _createMarket();
        uint256 tenDollars = 10e6;

        vm.prank(alice);
        market.buyShares(id, true, tenDollars, 0);

        vm.prank(admin);
        market.forceResolveMarket(id, PredictionMarket.Outcome.YES);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        market.claimWinnings(id);
        uint256 balAfter = usdc.balanceOf(alice);

        // At ~50% entry, each YES share pays 1 mUSDC — more shares than net stake ⇒ payout > stake.
        assertGt(balAfter - balBefore, tenDollars);
    }

    // ── Resolution ────────────────────────────────────────────────────────────

    function test_ResolveMarket() public {
        uint256 id = _createMarket();
        vm.warp(block.timestamp + 2 days);

        vm.prank(admin);
        market.resolveMarket(id, PredictionMarket.Outcome.YES);

        (PredictionMarket.MarketInfo memory info,) = market.getMarket(id);
        assertTrue(info.resolved);
        assertEq(uint8(info.outcome), uint8(PredictionMarket.Outcome.YES));
    }

    function test_ForceResolveMarket() public {
        uint256 id = _createMarket();
        // No time warp — should still work (force-resolve skips time check)
        vm.prank(admin);
        market.forceResolveMarket(id, PredictionMarket.Outcome.NO);

        (PredictionMarket.MarketInfo memory info,) = market.getMarket(id);
        assertTrue(info.resolved);
    }

    function test_ResolveMarket_TooEarly() public {
        uint256 id = _createMarket();
        vm.expectRevert("Too early");
        vm.prank(admin);
        market.resolveMarket(id, PredictionMarket.Outcome.YES);
    }

    function test_CannotTradeAfterClose() public {
        uint256 id = _createMarket();
        vm.warp(block.timestamp + 2 days); // past closing time

        vm.expectRevert("Market closed");
        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);
    }

    // ── Claim winnings ────────────────────────────────────────────────────────

    function test_ClaimWinnings_YES() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);

        vm.prank(bob);
        market.buyShares(id, false, TRADE, 0);

        vm.prank(admin);
        market.forceResolveMarket(id, PredictionMarket.Outcome.YES);

        PredictionMarket.Position memory pos = market.getUserPosition(id, alice);
        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        market.claimWinnings(id);

        uint256 balAfter = usdc.balanceOf(alice);
        assertEq(balAfter - balBefore, pos.yesShares); // 1 share = 1 mUSDC
    }

    function test_ClaimWinnings_LoserGetsNothing() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);

        vm.prank(bob);
        market.buyShares(id, false, TRADE, 0);

        vm.prank(admin);
        market.forceResolveMarket(id, PredictionMarket.Outcome.YES);

        // Bob backed NO — nothing to claim
        vm.expectRevert("Nothing to claim");
        vm.prank(bob);
        market.claimWinnings(id);
    }

    function test_ClaimWinnings_DoubleClaim() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);

        vm.prank(admin);
        market.forceResolveMarket(id, PredictionMarket.Outcome.YES);

        vm.startPrank(alice);
        market.claimWinnings(id);
        vm.expectRevert("Already claimed");
        market.claimWinnings(id);
        vm.stopPrank();
    }

    function test_PoolRemainsSolvent_AfterBuysSellsAndClaims() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyShares(id, true, 120e6, 0);
        vm.prank(bob);
        market.buyShares(id, false, 80e6, 0);

        PredictionMarket.Position memory bobPos = market.getUserPosition(id, bob);
        vm.prank(bob);
        market.sellShares(id, false, bobPos.noShares / 2, 0);

        // INVALID: both sides can claim (yesShares + noShares); YES/NO would zero one side.
        vm.prank(admin);
        market.forceResolveMarket(id, PredictionMarket.Outcome.INVALID);

        uint256 contractBalBeforeClaims = usdc.balanceOf(address(market));

        vm.prank(alice);
        market.claimWinnings(id);
        vm.prank(bob);
        market.claimWinnings(id);

        uint256 contractBalAfterClaims = usdc.balanceOf(address(market));
        assertLe(contractBalAfterClaims, contractBalBeforeClaims);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function test_GetAllMarkets() public {
        _createMarket();
        _createMarket();

        (PredictionMarket.MarketInfo[] memory mArr,) = market.getAllMarkets();
        assertEq(mArr.length, 2);
        assertEq(mArr[0].id, 1);
        assertEq(mArr[1].id, 2);
    }

    // ── getUserMarketIds ──────────────────────────────────────────────────────

    function test_GetUserMarketIds_WithPosition() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyShares(id, true, TRADE, 0);

        uint256[] memory ids = market.getUserMarketIds(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], id);
    }

    function test_GetUserMarketIds_NoPosition() public {
        _createMarket();
        uint256[] memory ids = market.getUserMarketIds(alice);
        assertEq(ids.length, 0);
    }

    function test_GetUserMarketIds_AfterSell() public {
        uint256 id = _createMarket();

        vm.startPrank(alice);
        market.buyShares(id, true, TRADE, 0);
        PredictionMarket.Position memory pos = market.getUserPosition(id, alice);
        market.sellShares(id, true, pos.yesShares, 0);
        vm.stopPrank();

        // After full sell, no shares remain
        uint256[] memory ids = market.getUserMarketIds(alice);
        assertEq(ids.length, 0);
    }

    // ── MockUSDC faucet ───────────────────────────────────────────────────────

    function test_Faucet() public {
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        usdc.faucet();
        assertEq(usdc.balanceOf(alice) - balBefore, 1_000e6);
    }

    function test_Faucet_RateLimit() public {
        vm.startPrank(alice);
        usdc.faucet();
        vm.expectRevert("Faucet: too soon");
        usdc.faucet();
        vm.stopPrank();
    }
}
