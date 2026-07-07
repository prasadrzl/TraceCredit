// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stateless interest math engine — pure kink model functions.
interface IInterestAccrualEngine {
    // ── Views (all pure/view) ─────────────────────────────────────────────────
    /**
     * @notice Compute the annual borrow rate for a given utilisation.
     * @param utilization Utilisation ratio scaled to 1e18 (1e18 = 100%).
     * @return annualRateBps Annual rate in basis points.
     */
    function calcRate(uint256 utilization) external view returns (uint256 annualRateBps);

    /**
     * @notice Compute simple interest accrued over a number of elapsed blocks.
     * @param principal      Loan principal (USDC, 6 decimals).
     * @param annualRateBps  Annual rate in basis points.
     * @param elapsedBlocks  Number of blocks elapsed since loan start.
     * @return interest      Accrued interest (USDC, 6 decimals).
     */
    function calcAccrued(uint256 principal, uint256 annualRateBps, uint256 elapsedBlocks)
        external
        view
        returns (uint256 interest);

    /**
     * @notice Split total interest into reserve and LP portions.
     * @param interest         Total interest to split.
     * @param reserveFactorBps Reserve factor in basis points.
     * @return reserveCut Amount routed to the reserve.
     * @return lpCut      Amount kept in the LP vault.
     */
    function calcFee(uint256 interest, uint16 reserveFactorBps)
        external
        pure
        returns (uint256 reserveCut, uint256 lpCut);

    // ── Governance-settable parameter views ───────────────────────────────────
    function BASE_RATE()        external view returns (uint256);
    function SLOPE_1()          external view returns (uint256);
    function JUMP_MULTIPLIER()  external view returns (uint256);
    function KINK()             external view returns (uint256);
    function BLOCKS_PER_YEAR()  external view returns (uint256);

    function setBlocksPerYear(uint256 blocksPerYear_) external;
}
