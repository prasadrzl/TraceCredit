// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for CreditLineManager — per-wallet credit limit and utilisation tracking.
interface ICreditLineManager {
    // ── Types ─────────────────────────────────────────────────────────────────
    struct CreditLine {
        uint256 limit;
        uint256 used;
        uint40  lastIncreaseAt;
        bool    frozen;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    event CreditLineDebited(address indexed wallet, uint256 amount, uint256 used);
    event CreditLineCredited(address indexed wallet, uint256 amount, uint256 used);
    event CreditLineIncreased(address indexed wallet, uint256 oldLimit, uint256 newLimit);
    event CreditLineFrozen(address indexed wallet);
    event CreditLineUnfrozen(address indexed wallet);

    // ── Errors ────────────────────────────────────────────────────────────────
    error CreditLineFrozenError();
    error ExceedsLimit();
    error LockupNotExpired();
    error ScoreInsufficientForIncrease();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /// @notice Debit (increase used) when a borrow is made. Only LENDING_POOL_ROLE.
    /// @param wallet Address of borrower.
    /// @param amount Amount to debit.
    function debit(address wallet, uint256 amount) external;

    /// @notice Credit (decrease used) on repayment. Only LENDING_POOL_ROLE.
    /// @param wallet Address of borrower.
    /// @param amount Amount to credit back.
    function credit(address wallet, uint256 amount) external;

    /**
     * @notice Request a credit limit increase for the caller's wallet.
     *         Validates tier lockup period and score qualification via IScoreEngine.
     *         Callable by the wallet owner.
     */
    function requestIncrease() external;

    /// @notice Freeze a credit line. Only GUARDIAN_ROLE.
    /// @param wallet Address to freeze.
    function freeze(address wallet) external;

    /// @notice Unfreeze a credit line. Only GUARDIAN_ROLE.
    /// @param wallet Address to unfreeze.
    function unfreeze(address wallet) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the full credit line record for a wallet.
    function getCreditLine(address wallet) external view returns (CreditLine memory);

    /// @notice Returns the available (limit − used) allowance for a wallet.
    function available(address wallet) external view returns (uint256);
}
