// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for RateLimiter — 24-hour rolling borrow cap per wallet.
interface IRateLimiter {
    // ── Events ────────────────────────────────────────────────────────────────
    event WindowReset(address indexed wallet, uint256 timestamp);
    event DailyLimitUpdated(uint8 indexed tier, uint256 newLimit);

    // ── Errors ────────────────────────────────────────────────────────────────
    error RateLimitExceeded(uint256 available, uint256 requested);

    // ── Mutative ──────────────────────────────────────────────────────────────
    /**
     * @notice Check a borrow against the rolling window and record it on success.
     *         Reverts with RateLimitExceeded if the daily cap is breached.
     *         Only LENDING_POOL_ROLE.
     * @param wallet Address of the borrower.
     * @param amount Amount being borrowed (USDC, 6 decimals).
     * @param tier   Borrower's credit tier (0=Bronze … 4=Diamond).
     */
    function checkAndRecord(address wallet, uint256 amount, uint8 tier) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /**
     * @notice Returns the remaining daily allowance for a wallet within the current window.
     * @param wallet Address to query.
     * @param tier   Wallet's credit tier.
     */
    function remaining(address wallet, uint8 tier) external view returns (uint256);
}
