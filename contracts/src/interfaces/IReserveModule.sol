// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the ReserveModule — protocol treasury that absorbs bad debt.
interface IReserveModule {
    // ── Events ────────────────────────────────────────────────────────────────
    event LossAbsorbed(uint256 amount, uint256 reserveBalance);
    event StrategyDeployed(address indexed strategy, uint256 amount);
    event StrategyWithdrawn(address indexed strategy, uint256 amount);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);

    // ── Errors ────────────────────────────────────────────────────────────────
    error InsufficientReserve();
    error BelowMinimumFloor();
    error UnknownStrategy();
    error TransferFailed();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /// @notice Absorb a bad-debt loss. Only LENDING_POOL_ROLE.
    /// @param amount USDC amount to write off.
    function absorbLoss(uint256 amount) external;

    /**
     * @notice Deploy idle reserves to a whitelisted yield strategy. Only GOVERNOR_ROLE.
     * @param strategy Target strategy contract address.
     * @param amount   USDC amount to deploy.
     */
    function deployToStrategy(address strategy, uint256 amount) external;

    /**
     * @notice Withdraw funds from a strategy back to the reserve. Only GOVERNOR_ROLE.
     * @param strategy Source strategy contract address.
     * @param amount   USDC amount to withdraw.
     */
    function withdrawFromStrategy(address strategy, uint256 amount) external;

    /// @notice Whitelist a yield strategy. Only GOVERNOR_ROLE.
    function addStrategy(address strategy) external;

    /// @notice Remove a strategy from the whitelist. Only GOVERNOR_ROLE.
    function removeStrategy(address strategy) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns current USDC balance held in the reserve.
    function reserveBalance() external view returns (uint256);

    /// @notice Returns the minimum reserve floor in USDC.
    function minimumReserveFloor() external view returns (uint256);
}
