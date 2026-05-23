// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IRateLimiter} from "../interfaces/IRateLimiter.sol";

/**
 * @notice 24-hour rolling borrow cap per wallet keyed to credit tier.
 *         Without this a stolen Diamond-tier wallet could drain 100k USDC in
 *         a single block before the multisig can react.
 *
 *         The rolling window resets lazily on each borrow — no keeper required.
 *
 *         Default daily limits:
 *           Silver   →    500 USDC  (full tier limit — no extra restriction)
 *           Gold     →  2,500 USDC  (50% of tier limit per 24 h)
 *           Platinum → 10,000 USDC  (40% of tier limit per 24 h)
 *           Diamond  → 25,000 USDC  (25% of tier limit per 24 h)
 */
contract RateLimiter is ProtocolBase, IRateLimiter {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant WINDOW_DURATION = 24 hours;

    // ── Types ─────────────────────────────────────────────────────────────────
    struct RollingWindow {
        uint256 totalBorrowed;
        uint40  windowStart;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    mapping(address => RollingWindow) public windows;

    /*
     * Index: 0=Bronze, 1=Silver, 2=Gold, 3=Platinum, 4=Diamond
     * Bronze is 0 → no borrowing allowed (limit == 0 enforced upstream).
     */
    mapping(uint8 => uint256) public dailyLimit;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the RateLimiter with default daily caps.
     * @param admin     Address granted all admin roles.
     * @param treasury_ Protocol treasury address.
     */
    function initialize(address admin, address treasury_) external initializer {
        __ProtocolBase_init(admin, treasury_);
        dailyLimit[0] = 0;           // Bronze — no borrow
        dailyLimit[1] = 500e6;       // Silver  —    500 USDC
        dailyLimit[2] = 2_500e6;     // Gold    —  2,500 USDC
        dailyLimit[3] = 10_000e6;    // Platinum— 10,000 USDC
        dailyLimit[4] = 25_000e6;    // Diamond — 25,000 USDC
    }

    // ── Governance ────────────────────────────────────────────────────────────
    /**
     * @notice Update the daily rolling limit for a tier. Only GOVERNOR_ROLE.
     * @param tier     Tier index (0=Bronze … 4=Diamond).
     * @param newLimit New 24-hour cap in USDC (6 decimals).
     */
    function setDailyLimit(uint8 tier, uint256 newLimit) external onlyRole(GOVERNOR_ROLE) {
        dailyLimit[tier] = newLimit;
        emit DailyLimitUpdated(tier, newLimit);
    }

    // ── IRateLimiter ──────────────────────────────────────────────────────────
    /**
     * @notice Check and record a borrow. Resets the window if 24 hours have elapsed.
     *         Reverts with RateLimitExceeded if daily cap is breached.
     *         Only LENDING_POOL_ROLE.
     * @param wallet Address of the borrower.
     * @param amount Amount being borrowed (USDC, 6 decimals).
     * @param tier   Borrower's credit tier (0=Bronze … 4=Diamond).
     */
    function checkAndRecord(address wallet, uint256 amount, uint8 tier)
        external
        onlyRole(LENDING_POOL_ROLE)
    {
        RollingWindow storage w = windows[wallet];
        uint256 cap = dailyLimit[tier];

        if (block.timestamp >= uint256(w.windowStart) + WINDOW_DURATION) {
            w.totalBorrowed = 0;
            w.windowStart   = uint40(block.timestamp);
            emit WindowReset(wallet, block.timestamp);
        }

        uint256 projected = w.totalBorrowed + amount;
        if (projected > cap) revert RateLimitExceeded(cap - w.totalBorrowed, amount);

        unchecked { w.totalBorrowed += amount; } // safe: checked above
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /**
     * @notice Returns remaining daily allowance for a wallet within the current window.
     * @param wallet Address to query.
     * @param tier   Wallet's credit tier.
     */
    function remaining(address wallet, uint8 tier) external view returns (uint256) {
        RollingWindow storage w = windows[wallet];
        uint256 cap = dailyLimit[tier];
        if (block.timestamp >= uint256(w.windowStart) + WINDOW_DURATION) return cap;
        return cap > w.totalBorrowed ? cap - w.totalBorrowed : 0;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
