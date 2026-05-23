// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IScoreEngine} from "../interfaces/IScoreEngine.sol";
import {ICreditLineManager} from "../interfaces/ICreditLineManager.sol";

/**
 * @notice Manages per-wallet credit lines: limit, utilisation, freezes, and
 *         limit-increase lockup enforcement. LendingPool becomes a pure fund-flow
 *         contract by delegating all limit logic here.
 */
contract CreditLineManager is ProtocolBase, ICreditLineManager {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    // ── State ─────────────────────────────────────────────────────────────────
    address public scoreEngine;

    mapping(address => CreditLine) public creditLines;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the CreditLineManager.
     * @param admin        Address granted all admin roles.
     * @param treasury_    Protocol treasury address.
     * @param scoreEngine_ ScoreEngine address for tier/limit resolution.
     */
    function initialize(address admin, address treasury_, address scoreEngine_)
        external
        initializer
    {
        __ProtocolBase_init(admin, treasury_);
        if (scoreEngine_ == address(0)) revert ZeroAddress();
        scoreEngine = scoreEngine_;
    }

    // ── Governance ────────────────────────────────────────────────────────────
    /// @notice Update the ScoreEngine address. Only GOVERNOR_ROLE.
    /// @param addr New ScoreEngine address.
    function setScoreEngine(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        scoreEngine = addr;
    }

    // ── ICreditLineManager ────────────────────────────────────────────────────
    /// @notice Debit (increase used) when a borrow is made. Only LENDING_POOL_ROLE.
    /// @param wallet Address of borrower.
    /// @param amount Amount to debit.
    function debit(address wallet, uint256 amount) external onlyRole(LENDING_POOL_ROLE) {
        CreditLine storage cl = creditLines[wallet];
        if (cl.frozen)            revert CreditLineFrozenError();
        if (cl.used + amount > cl.limit) revert ExceedsLimit();
        unchecked { cl.used += amount; } // safe: checked above
        emit CreditLineDebited(wallet, amount, cl.used);
    }

    /// @notice Credit (decrease used) on repayment. Only LENDING_POOL_ROLE.
    /// @param wallet Address of borrower.
    /// @param amount Amount to credit back.
    function credit(address wallet, uint256 amount) external onlyRole(LENDING_POOL_ROLE) {
        CreditLine storage cl = creditLines[wallet];
        cl.used = cl.used >= amount ? cl.used - amount : 0;
        emit CreditLineCredited(wallet, amount, cl.used);
    }

    /**
     * @notice Request a credit limit increase for the caller's wallet.
     *         Checks: (1) score qualifies per IScoreEngine.getCreditLimit(),
     *                 (2) block.timestamp >= lastIncreaseAt + tierLockup.
     */
    function requestIncrease() external whenNotPaused {
        address wallet = msg.sender;
        CreditLine storage cl = creditLines[wallet];
        if (cl.frozen) revert CreditLineFrozenError();

        IScoreEngine engine = IScoreEngine(scoreEngine);
        uint256 newLimit    = engine.getCreditLimit(wallet);
        if (newLimit <= cl.limit) revert ScoreInsufficientForIncrease();

        uint256 lockup = engine.getLimitLockup(wallet);
        if (block.timestamp < uint256(cl.lastIncreaseAt) + lockup) revert LockupNotExpired();

        uint256 old = cl.limit;
        cl.limit          = newLimit;
        cl.lastIncreaseAt = uint40(block.timestamp);

        // Initialise `used` to 0 for new credit lines that have never been set.
        emit CreditLineIncreased(wallet, old, newLimit);
    }

    /// @notice Freeze a credit line. Only GUARDIAN_ROLE.
    /// @param wallet Address to freeze.
    function freeze(address wallet) external onlyRole(GUARDIAN_ROLE) {
        creditLines[wallet].frozen = true;
        emit CreditLineFrozen(wallet);
    }

    /// @notice Unfreeze a credit line. Only GUARDIAN_ROLE.
    /// @param wallet Address to unfreeze.
    function unfreeze(address wallet) external onlyRole(GUARDIAN_ROLE) {
        creditLines[wallet].frozen = false;
        emit CreditLineUnfrozen(wallet);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the full credit line record for a wallet.
    function getCreditLine(address wallet) external view returns (CreditLine memory) {
        return creditLines[wallet];
    }

    /// @notice Returns available (limit − used) allowance for a wallet.
    function available(address wallet) external view returns (uint256) {
        CreditLine storage cl = creditLines[wallet];
        return cl.limit > cl.used ? cl.limit - cl.used : 0;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[48] private __gap;
}
