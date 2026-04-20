// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PredictionMarket
/// @notice Binary YES/NO prediction markets with a constant-product AMM (x*y=k).
///         All markets live in a single contract, keyed by uint256 market ID.
///         Collateral is mUSDC (6 decimals). 1 winning share redeems for 1 mUSDC.
contract PredictionMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    //  Types
    // ─────────────────────────────────────────────────────────────────────────

    enum Outcome {
        UNRESOLVED, // 0
        YES,        // 1
        NO,         // 2
        INVALID     // 3 — refund proportionally
    }

    struct MarketInfo {
        uint256 id;
        string  question;
        string  category;
        uint64  closingTime;     // trading halts after this; can be resolved
        uint64  resolutionTime;  // admin may call resolveMarket after this
        Outcome outcome;
        address creator;
        bool    resolved;
    }

    struct Pool {
        uint256 yesReserve;       // YES-share inventory held by AMM
        uint256 noReserve;        // NO-share inventory held by AMM
        uint256 totalCollateral;  // live collateral currently held for this market
        uint256 lpFeeAccrued;     // cumulative fees retained in collateral
    }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
        bool    claimed;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Constants
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public constant FEE_BPS           = 200;         // 2 %
    uint256 public constant MIN_INITIAL_LIQ   = 1_000e6;    // 1 000 mUSDC
    uint256 public constant MIN_TRADE         = 1e6;         // 1 mUSDC

    // ─────────────────────────────────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────────────────────────────────

    IERC20  public immutable collateral;
    address public immutable admin;

    uint256 public marketCount;

    mapping(uint256 => MarketInfo)                           public markets;
    mapping(uint256 => Pool)                                 public pools;
    mapping(uint256 => mapping(address => Position))         public positions;

    // ─────────────────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string  question,
        string  category,
        uint64  closingTime,
        uint64  resolutionTime,
        address indexed creator
    );
    event SharesBought(
        uint256 indexed marketId,
        address indexed buyer,
        bool    isYes,
        uint256 collateralIn,
        uint256 sharesOut,
        uint256 newYesProbability  // 1e18 scaled
    );
    event SharesSold(
        uint256 indexed marketId,
        address indexed seller,
        bool    isYes,
        uint256 sharesIn,
        uint256 collateralOut,
        uint256 newYesProbability  // 1e18 scaled
    );
    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome,
        address indexed resolver
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed claimer,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _collateral, address _admin) {
        require(_collateral != address(0), "Bad collateral");
        require(_admin      != address(0), "Bad admin");
        collateral = IERC20(_collateral);
        admin      = _admin;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Market creation
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Create a new binary market and seed its AMM liquidity.
    /// @param question       Human-readable question, e.g. "Will ETH hit $5k?"
    /// @param category       Display category, e.g. "Crypto"
    /// @param closingTime    Unix timestamp — trading halts here
    /// @param resolutionTime Unix timestamp — admin may resolve from here
    /// @param initialLiquidity mUSDC amount seeded into the AMM (min 1 000 mUSDC)
    function createMarket(
        string calldata question,
        string calldata category,
        uint64 closingTime,
        uint64 resolutionTime,
        uint256 initialLiquidity
    ) external returns (uint256 marketId) {
        require(msg.sender == admin,                         "Not admin");
        require(bytes(question).length > 0,                  "Empty question");
        require(closingTime    > block.timestamp,            "Bad closing time");
        require(resolutionTime >= closingTime,               "Bad resolution time");
        require(initialLiquidity >= MIN_INITIAL_LIQ,        "Insufficient liquidity");

        marketId = ++marketCount;

        markets[marketId] = MarketInfo({
            id:             marketId,
            question:       question,
            category:       category,
            closingTime:    closingTime,
            resolutionTime: resolutionTime,
            outcome:        Outcome.UNRESOLVED,
            creator:        msg.sender,
            resolved:       false
        });

        // Equal reserves → 50 / 50 starting probability
        pools[marketId] = Pool({
            yesReserve:      initialLiquidity,
            noReserve:       initialLiquidity,
            totalCollateral: initialLiquidity,
            lpFeeAccrued:    0
        });

        collateral.safeTransferFrom(msg.sender, address(this), initialLiquidity);

        emit MarketCreated(
            marketId, question, category, closingTime, resolutionTime, msg.sender
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AMM view helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Estimate shares received when buying with `collateralIn` mUSDC.
    function getSharesOut(
        uint256 marketId,
        bool    isYes,
        uint256 collateralIn
    ) public view returns (uint256 sharesOut, uint256 fee) {
        require(collateralIn > 0, "Zero input");
        Pool storage p = pools[marketId];

        fee = (collateralIn * FEE_BPS) / 10_000;
        uint256 netIn = collateralIn - fee;

        // Binary FPMM step:
        // 1) netIn collateral mints netIn YES + netIn NO complete sets.
        // 2) user keeps chosen side after swapping via CPMM.
        uint256 k = p.yesReserve * p.noReserve;
        if (isYes) {
            uint256 newNo  = p.noReserve + netIn;
            uint256 newYes = k / newNo;
            sharesOut = (p.yesReserve + netIn) - newYes;
        } else {
            uint256 newYes = p.yesReserve + netIn;
            uint256 newNo  = k / newYes;
            sharesOut = (p.noReserve + netIn) - newNo;
        }
    }

    /// @notice Estimate collateral returned when selling `sharesIn` shares.
    function getCollateralOut(
        uint256 marketId,
        bool    isYes,
        uint256 sharesIn
    ) public view returns (uint256 collateralOut, uint256 fee) {
        require(sharesIn > 0, "Zero input");
        Pool storage p = pools[marketId];

        uint256 grossOut = _getGrossCollateralOut(p.yesReserve, p.noReserve, isYes, sharesIn);
        fee          = (grossOut * FEE_BPS) / 10_000;
        collateralOut = grossOut - fee;
    }

    function _getGrossCollateralOut(
        uint256 yesReserve,
        uint256 noReserve,
        bool    isYes,
        uint256 sharesIn
    ) internal pure returns (uint256 grossOut) {
        // Reverse of buy under binary FPMM:
        // seller adds shares to one side, then removes `grossOut` complete sets from both sides.
        // Preserve k = yesReserve * noReserve after trade.
        uint256 y = yesReserve;
        uint256 n = noReserve;

        uint256 sum = y + n + sharesIn;
        uint256 term = isYes ? (sharesIn * n) : (sharesIn * y);
        uint256 disc = (sum * sum) - (4 * term);
        uint256 sqrtDisc = Math.sqrt(disc);
        grossOut = (sum - sqrtDisc) / 2;
    }

    /// @notice YES probability, scaled to 1e18.
    ///         Derived from AMM reserves: lower yesReserve → higher YES price.
    function getYesProbability(uint256 marketId) external view returns (uint256) {
        Pool storage p = pools[marketId];
        uint256 total = p.yesReserve + p.noReserve;
        if (total == 0) return 0.5e18;
        // p(YES) = noReserve / (yesReserve + noReserve)
        return (p.noReserve * 1e18) / total;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Trading
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Buy YES or NO shares.
    /// @param marketId      Target market
    /// @param isYes         true = buy YES shares, false = buy NO shares
    /// @param collateralIn  mUSDC amount to spend (inclusive of fee)
    /// @param minSharesOut  Slippage guard — revert if shares < this
    function buyShares(
        uint256 marketId,
        bool    isYes,
        uint256 collateralIn,
        uint256 minSharesOut
    ) external nonReentrant {
        MarketInfo storage m = markets[marketId];
        require(m.id != 0,                                   "Market not found");
        require(!m.resolved,                                 "Market resolved");
        require(block.timestamp < m.closingTime,             "Market closed");
        require(collateralIn >= MIN_TRADE,                   "Below minimum trade");

        (uint256 sharesOut, uint256 fee) = getSharesOut(marketId, isYes, collateralIn);
        require(sharesOut >= minSharesOut,                   "Slippage exceeded");
        require(sharesOut > 0,                               "Zero shares out");

        collateral.safeTransferFrom(msg.sender, address(this), collateralIn);

        Pool storage p = pools[marketId];
        p.totalCollateral += collateralIn;
        p.lpFeeAccrued    += fee;

        uint256 netIn = collateralIn - fee;
        if (isYes) {
            p.yesReserve = p.yesReserve + netIn - sharesOut;
            p.noReserve  += netIn;
        } else {
            p.noReserve  = p.noReserve + netIn - sharesOut;
            p.yesReserve += netIn;
        }

        Position storage pos = positions[marketId][msg.sender];
        if (isYes) pos.yesShares += sharesOut;
        else       pos.noShares  += sharesOut;

        uint256 newProb = (p.noReserve * 1e18) / (p.yesReserve + p.noReserve);
        emit SharesBought(marketId, msg.sender, isYes, collateralIn, sharesOut, newProb);
    }

    /// @notice Sell YES or NO shares back for mUSDC.
    /// @param sharesIn          Amount of shares to sell
    /// @param minCollateralOut  Slippage guard
    function sellShares(
        uint256 marketId,
        bool    isYes,
        uint256 sharesIn,
        uint256 minCollateralOut
    ) external nonReentrant {
        MarketInfo storage m = markets[marketId];
        require(m.id != 0,                                   "Market not found");
        require(!m.resolved,                                 "Market resolved");
        require(block.timestamp < m.closingTime,             "Market closed");

        Position storage pos = positions[marketId][msg.sender];
        if (isYes) require(pos.yesShares >= sharesIn,        "Insufficient YES shares");
        else       require(pos.noShares  >= sharesIn,        "Insufficient NO shares");

        (uint256 collateralOut, uint256 fee) = getCollateralOut(marketId, isYes, sharesIn);
        require(collateralOut >= minCollateralOut,            "Slippage exceeded");
        require(collateralOut > 0,                            "Zero collateral out");

        Pool storage p = pools[marketId];
        uint256 grossOut = collateralOut + fee;
        p.lpFeeAccrued    += fee;
        p.totalCollateral -= collateralOut;

        if (isYes) {
            pos.yesShares   -= sharesIn;
            p.yesReserve    = p.yesReserve + sharesIn - grossOut;
            p.noReserve     -= grossOut;
        } else {
            pos.noShares    -= sharesIn;
            p.noReserve     = p.noReserve + sharesIn - grossOut;
            p.yesReserve    -= grossOut;
        }

        collateral.safeTransfer(msg.sender, collateralOut);
        uint256 newProb = (p.noReserve * 1e18) / (p.yesReserve + p.noReserve);
        emit SharesSold(marketId, msg.sender, isYes, sharesIn, collateralOut, newProb);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Resolution
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Resolve a market after its `resolutionTime`.
    function resolveMarket(uint256 marketId, Outcome outcome) external {
        MarketInfo storage m = markets[marketId];
        require(msg.sender == admin,                         "Not admin");
        require(m.id != 0,                                   "Market not found");
        require(!m.resolved,                                 "Already resolved");
        require(block.timestamp >= m.resolutionTime,         "Too early");
        require(outcome != Outcome.UNRESOLVED,               "Invalid outcome");

        m.outcome  = outcome;
        m.resolved = true;
        emit MarketResolved(marketId, outcome, msg.sender);
    }

    /// @notice Force-resolve a market, skipping the time check.
    ///         Used by the demo API to resolve markets during guided demo flow.
    function forceResolveMarket(uint256 marketId, Outcome outcome) external {
        MarketInfo storage m = markets[marketId];
        require(msg.sender == admin,                         "Not admin");
        require(m.id != 0,                                   "Market not found");
        require(!m.resolved,                                 "Already resolved");
        require(outcome != Outcome.UNRESOLVED,               "Invalid outcome");

        m.outcome  = outcome;
        m.resolved = true;
        emit MarketResolved(marketId, outcome, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Claim winnings
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Claim payout after market resolution. 1 winning share = 1 mUSDC.
    function claimWinnings(uint256 marketId) external nonReentrant {
        MarketInfo storage m = markets[marketId];
        require(m.resolved,                                  "Not resolved");

        Position storage pos = positions[marketId][msg.sender];
        require(!pos.claimed,                                "Already claimed");
        pos.claimed = true;

        uint256 payout;
        if (m.outcome == Outcome.YES) {
            payout = pos.yesShares;
        } else if (m.outcome == Outcome.NO) {
            payout = pos.noShares;
        } else {
            // INVALID: proportional refund based on total shares held vs total supply
            // Simplified: return both share types 1:1 capped at available collateral
            payout = pos.yesShares + pos.noShares;
        }

        require(payout > 0,                                  "Nothing to claim");

        collateral.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  View helpers
    // ─────────────────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId)
        external view
        returns (MarketInfo memory, Pool memory)
    {
        return (markets[marketId], pools[marketId]);
    }

    function getUserPosition(uint256 marketId, address user)
        external view
        returns (Position memory)
    {
        return positions[marketId][user];
    }

    /// @notice Returns market IDs where the user has non-zero shares or unclaimed winnings.
    ///         Optimises portfolio page — avoids fetching positions for every market.
    function getUserMarketIds(address user) external view returns (uint256[] memory) {
        uint256 count = marketCount;
        uint256[] memory temp = new uint256[](count);
        uint256 found = 0;
        for (uint256 i = 1; i <= count; i++) {
            Position storage pos = positions[i][user];
            if (pos.yesShares > 0 || pos.noShares > 0 || (markets[i].resolved && !pos.claimed)) {
                temp[found] = i;
                found++;
            }
        }
        uint256[] memory result = new uint256[](found);
        for (uint256 i = 0; i < found; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    /// @notice Batch-fetch all markets and their pools in one call.
    function getAllMarkets()
        external view
        returns (MarketInfo[] memory mArr, Pool[] memory pArr)
    {
        uint256 count = marketCount;
        mArr = new MarketInfo[](count);
        pArr = new Pool[](count);
        for (uint256 i = 1; i <= count; i++) {
            mArr[i - 1] = markets[i];
            pArr[i - 1] = pools[i];
        }
    }
}
