// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for LiquidationManager — keeper-callable default resolution.
interface ILiquidationManager {
    // ── Events ────────────────────────────────────────────────────────────────
    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed wallet,
        uint256 amount,
        uint256 timestamp
    );

    // ── Errors ────────────────────────────────────────────────────────────────
    error LoanNotDefaulted();
    error GracePeriodStillActive();
    error AlreadyLiquidated();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /// @notice Liquidate a single defaulted loan. KEEPER_ROLE or LIQUIDATION_BOT_ROLE.
    /// @param loanId Loan identifier.
    function liquidate(uint256 loanId) external;

    /**
     * @notice Gas-efficient batch liquidation. Silently skips already-liquidated loans.
     * @param loanIds Array of loan identifiers to process.
     */
    function batchLiquidate(uint256[] calldata loanIds) external;
}
