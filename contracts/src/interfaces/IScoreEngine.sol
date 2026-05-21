// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IScoreEngine {
    // ── Events ───────────────────────────────────────────────────────────────
    event SignalProcessed(address indexed wallet, SignalType signal, int16 delta);

    // ── Types ────────────────────────────────────────────────────────────────
    enum SignalType {
        LOAN_REPAID_ON_TIME,
        LOAN_REPAID_CROSS_PROTOCOL,
        WALLET_AGE_ACCRUAL,
        DAO_PARTICIPATION,
        TOKEN_HOLDING_DURATION,
        SBT_STAKE_DEPOSIT,
        DEFAULT,
        LATE_REPAYMENT,
        SUSPICIOUS_CYCLING
    }

    // ── Structs ───────────────────────────────────────────────────────────────
    struct CreditTier {
        uint16 minScore;
        uint16 maxScore;
        uint256 maxBorrowLimit;
        uint256 interestRateBps;
        uint256 increaseLockupSeconds;
    }

    // ── Core ─────────────────────────────────────────────────────────────────
    function processSignal(address wallet, SignalType signal, bytes calldata data) external;

    // ── Views ────────────────────────────────────────────────────────────────
    function getCreditTier(address wallet) external view returns (CreditTier memory);
    function getMaxBorrowLimit(address wallet) external view returns (uint256);
    function getInterestRateBps(address wallet) external view returns (uint256);
    function canIncreaseCreditLimit(address wallet) external view returns (bool);
}
