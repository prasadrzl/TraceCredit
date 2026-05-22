// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for SBTStakeVault — holds USDC stakes for SBT minting.
interface ISBTStakeVault {
    // ── Types ─────────────────────────────────────────────────────────────────
    struct StakeRecord {
        uint256 amount;
        uint40  depositedAt;
        uint40  unlockAt;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    event StakeDeposited(address indexed wallet, uint256 amount);
    event StakeReleased(address indexed wallet, uint256 amount);
    event StakeSlashed(address indexed wallet, uint256 amount, address indexed recipient);
    event StakeAmountUpdated(uint256 oldAmount, uint256 newAmount);

    // ── Errors ────────────────────────────────────────────────────────────────
    error StillLocked(uint256 unlockAt);
    error NoStakeFound();
    error InsufficientStakeBalance();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /**
     * @notice Pull stakeAmount USDC from wallet and record the stake. Only SBT_CONTRACT_ROLE.
     * @param wallet Address to stake on behalf of.
     */
    function deposit(address wallet) external;

    /**
     * @notice Return the stake to wallet after the 30-day unlock delay. Only SBT_CONTRACT_ROLE.
     * @param wallet Address whose stake to release.
     */
    function release(address wallet) external;

    /**
     * @notice Slash a portion of the stake and send to a recipient. Only GUARDIAN_ROLE.
     * @param wallet    Address whose stake to slash.
     * @param amount    USDC amount to slash.
     * @param recipient Recipient of the slashed funds (e.g. ReserveModule).
     */
    function slash(address wallet, uint256 amount, address recipient) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the stake record for a wallet.
    function stakes(address wallet) external view returns (StakeRecord memory);

    /// @notice Returns the current required stake amount (governable by GOVERNOR_ROLE).
    function stakeAmount() external view returns (uint256);
}
