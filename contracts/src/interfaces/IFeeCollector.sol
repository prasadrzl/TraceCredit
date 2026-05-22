// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for FeeCollector — governable reserve/DAO/LP fee split.
interface IFeeCollector {
    // ── Events ────────────────────────────────────────────────────────────────
    event FeesDistributed(uint256 reserveCut, uint256 daoCut, uint256 lpCut);
    event FeeSplitUpdated(uint16 reserveShareBps, uint16 daoShareBps, uint16 lpShareBps);

    // ── Errors ────────────────────────────────────────────────────────────────
    error SplitMustSumTo10000();
    error TransferFailed();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /**
     * @notice Distribute interest into reserve, DAO, and LP cuts.
     *         Caller must have already transferred the USDC to this contract.
     *         Only LENDING_POOL_ROLE.
     * @param totalInterest Total interest amount (USDC, 6 decimals).
     */
    function distributeFees(uint256 totalInterest) external;

    /**
     * @notice Update the fee split ratios. Values must sum to 10000 bps. Only GOVERNOR_ROLE.
     * @param reserve Reserve share in bps.
     * @param dao     DAO share in bps.
     * @param lp      LP share in bps (stays in vault).
     */
    function setFeeSplit(uint16 reserve, uint16 dao, uint16 lp) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    function reserveShareBps() external view returns (uint16);
    function daoShareBps()     external view returns (uint16);
    function lpShareBps()      external view returns (uint16);
}
