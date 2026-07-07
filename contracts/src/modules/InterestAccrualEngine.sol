// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IInterestAccrualEngine} from "../interfaces/IInterestAccrualEngine.sol";

/**
 * @notice Stateless kink-model interest math engine.
 *         Zero storage mutations — all functions are pure or view.
 *         Upgrading the interest model is a single ProtocolRegistry.setAddress() call;
 *         LendingPool requires no changes.
 *
 *         Rate model:
 *           u < KINK  → BASE_RATE + u * SLOPE_1
 *           u ≥ KINK  → BASE_RATE + KINK * SLOPE_1 + (u - KINK) * JUMP_MULTIPLIER
 *         where u is utilisation scaled to 1e18.
 */
contract InterestAccrualEngine is ProtocolBase, IInterestAccrualEngine {
    uint256 public constant BPS_DENOMINATOR  = 10_000;
    uint256 public constant SCALE            = 1e18;

    // ── Governable rate parameters ────────────────────────────────────────────
    uint256 public BASE_RATE;        // bps (default 200 = 2 %)
    uint256 public SLOPE_1;          // bps added per unit utilisation below kink (default 1000)
    uint256 public JUMP_MULTIPLIER;  // bps added per unit utilisation above kink (default 30000)
    uint256 public KINK;             // utilisation kink, 1e18 scale (default 0.7e18)
    // Governable so Base / Optimism (~2-second blocks, ~15.7 M/year) can be corrected
    // without a full contract upgrade. Ethereum mainnet: 2_628_000. Base/Optimism: 15_768_000.
    uint256 public BLOCKS_PER_YEAR;

    // ── Events ────────────────────────────────────────────────────────────────
    event RateParamsUpdated(uint256 baseRate, uint256 slope1, uint256 jumpMultiplier, uint256 kink);
    event BlocksPerYearUpdated(uint256 newValue);

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise with default kink-model parameters.
     * @param admin     Address granted all admin roles.
     * @param treasury_ Protocol treasury address.
     */
    function initialize(address admin, address treasury_) external initializer {
        __ProtocolBase_init(admin, treasury_);
        BASE_RATE        = 200;
        SLOPE_1          = 1_000;
        JUMP_MULTIPLIER  = 30_000;
        KINK             = 0.7e18;
        BLOCKS_PER_YEAR  = 15_768_000; // Base / Optimism: ~2-second blocks
    }

    // ── Governance ────────────────────────────────────────────────────────────
    /**
     * @notice Update all rate parameters atomically. Only GOVERNOR_ROLE.
     * @param baseRate_       New base rate in bps.
     * @param slope1_         New slope below kink in bps.
     * @param jumpMultiplier_ New jump multiplier above kink in bps.
     * @param kink_           New kink utilisation (1e18 scale).
     */
    function setRateParams(
        uint256 baseRate_,
        uint256 slope1_,
        uint256 jumpMultiplier_,
        uint256 kink_
    ) external onlyRole(GOVERNOR_ROLE) {
        require(kink_ <= SCALE, "Kink > 100%");
        BASE_RATE       = baseRate_;
        SLOPE_1         = slope1_;
        JUMP_MULTIPLIER = jumpMultiplier_;
        KINK            = kink_;
        emit RateParamsUpdated(baseRate_, slope1_, jumpMultiplier_, kink_);
    }

    /**
     * @notice Update the blocks-per-year denominator. Only GOVERNOR_ROLE.
     *         Use 15_768_000 for Base/Optimism (~2-second blocks),
     *         2_628_000 for Ethereum mainnet (~12-second blocks).
     * @param blocksPerYear_ New blocks-per-year value.
     */
    function setBlocksPerYear(uint256 blocksPerYear_) external onlyRole(GOVERNOR_ROLE) {
        require(blocksPerYear_ > 0, "Invalid blocksPerYear");
        BLOCKS_PER_YEAR = blocksPerYear_;
        emit BlocksPerYearUpdated(blocksPerYear_);
    }

    // ── IInterestAccrualEngine ────────────────────────────────────────────────
    /**
     * @notice Compute the annual borrow rate for a given utilisation.
     * @param utilization Utilisation ratio (1e18 = 100%).
     * @return annualRateBps Annual rate in basis points.
     */
    function calcRate(uint256 utilization) external view returns (uint256 annualRateBps) {
        if (utilization <= KINK) {
            return BASE_RATE + (utilization * SLOPE_1) / SCALE;
        }
        uint256 normalRate = BASE_RATE + (KINK * SLOPE_1) / SCALE;
        uint256 excessUtil = utilization - KINK;
        return normalRate + (excessUtil * JUMP_MULTIPLIER) / SCALE;
    }

    /**
     * @notice Compute simple interest over elapsed blocks.
     * @param principal      Loan principal (USDC, 6 decimals).
     * @param annualRateBps  Annual rate in basis points.
     * @param elapsedBlocks  Blocks elapsed since loan start.
     * @return interest      Accrued interest (USDC, 6 decimals).
     */
    function calcAccrued(uint256 principal, uint256 annualRateBps, uint256 elapsedBlocks)
        external
        view
        returns (uint256 interest)
    {
        return (principal * annualRateBps * elapsedBlocks) / (BLOCKS_PER_YEAR * BPS_DENOMINATOR);
    }

    /**
     * @notice Split interest into reserve and LP portions.
     * @param interest         Total interest amount.
     * @param reserveFactorBps Reserve factor in basis points.
     * @return reserveCut Amount sent to the reserve.
     * @return lpCut      Remainder kept in the LP vault.
     */
    function calcFee(uint256 interest, uint16 reserveFactorBps)
        external
        pure
        returns (uint256 reserveCut, uint256 lpCut)
    {
        reserveCut = (interest * uint256(reserveFactorBps)) / BPS_DENOMINATOR;
        lpCut      = interest - reserveCut;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[45] private __gap;
}
