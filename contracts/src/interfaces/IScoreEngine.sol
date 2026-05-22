// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the ScoreEngine — the sole writer to the SBT score.
interface IScoreEngine {
    // ── Types ─────────────────────────────────────────────────────────────────
    enum SignalType {
        ON_TIME_REPAYMENT,        // 0
        CROSS_PROTOCOL_REPAYMENT, // 1
        WALLET_AGE,               // 2
        DAO_VOTE,                 // 3
        TOKEN_HOLDING,            // 4
        SBT_STAKE,                // 5
        DEFAULT,                  // 6
        LATE_REPAYMENT,           // 7
        WASH_CYCLE                // 8
    }

    enum Tier { Bronze, Silver, Gold, Platinum, Diamond }

    // ── Events ────────────────────────────────────────────────────────────────
    event SignalProcessed(address indexed wallet, SignalType indexed signal, int16 delta);
    event DecayApplied(address indexed wallet, int16 delta);

    // ── Errors ────────────────────────────────────────────────────────────────
    error UnauthorisedCaller();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /**
     * @notice Process a reputation signal for a wallet.
     *         Access is restricted per signal type (LENDING_POOL_ROLE or BRIDGE_ROLE).
     * @param wallet Target wallet.
     * @param signal Signal type from the SignalType enum.
     */
    function processSignal(address wallet, SignalType signal) external;

    /// @notice Apply time-decay to a wallet's score. Only KEEPER_ROLE.
    /// @param wallet Target wallet.
    function applyDecay(address wallet) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the credit tier for a wallet.
    function getCreditTier(address wallet) external view returns (Tier);

    /// @notice Returns the maximum borrowable USDC (6 decimals) for a wallet.
    function getCreditLimit(address wallet) external view returns (uint256);

    /// @notice Returns the annual interest rate in bps for a wallet's tier.
    function getInterestRateBps(address wallet) external view returns (uint256);

    /// @notice Returns the limit-increase lockup period in seconds for a wallet's tier.
    function getLimitLockup(address wallet) external view returns (uint256);
}
