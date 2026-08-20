// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IReserveModule} from "../interfaces/IReserveModule.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice Protocol treasury that absorbs bad debt from defaults.
 *         Funded by 15% of all interest income routed by LendingPool.
 *         A minimum reserve floor prevents the reserve from being fully drained.
 *         The DAO may deploy idle reserves to whitelisted yield strategies.
 */
contract ReserveModule is ProtocolBase, IReserveModule {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant DEFAULT_MINIMUM_FLOOR = 10_000e6; // 10,000 USDC

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20  public usdc;
    uint256 public minimumReserveFloor;

    /// @dev LendingPool address reimbursed when the reserve absorbs a loss.
    address public lendingPool;

    mapping(address => bool) public isWhitelistedStrategy;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the ReserveModule.
     * @param admin     Address granted all admin roles.
     * @param treasury_ Protocol treasury address.
     * @param usdc_     USDC token address.
     */
    function initialize(address admin, address treasury_, address usdc_)
        external
        initializer
    {
        __ProtocolBase_init(admin, treasury_);
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc                = IERC20(usdc_);
        minimumReserveFloor = DEFAULT_MINIMUM_FLOOR;
    }

    // ── Governance ────────────────────────────────────────────────────────────
    /// @notice Update the minimum reserve floor. Only GOVERNOR_ROLE.
    /// @param floor New floor in USDC (6 decimals).
    function setMinimumReserveFloor(uint256 floor) external onlyRole(GOVERNOR_ROLE) {
        minimumReserveFloor = floor;
    }

    /// @notice Set the LendingPool reimbursed on loss absorption. Only GOVERNOR_ROLE.
    /// @param addr LendingPool address.
    function setLendingPool(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        lendingPool = addr;
    }

    // ── IReserveModule ────────────────────────────────────────────────────────
    /**
     * @notice Reimburse the LendingPool for a bad-debt loss, up to the reserve's
     *         available balance. Covers as much of the loss as it can and returns
     *         the covered amount so the caller writes off only the true shortfall.
     *         Never reverts on an underfunded reserve — a large default must still
     *         be resolvable. The minimum floor guards strategy deployment, not
     *         loss coverage, so the reserve may be drawn down to zero here.
     *         Only LENDING_POOL_ROLE.
     * @param amount  USDC loss to cover.
     * @return covered USDC actually transferred to the pool (min(balance, amount)).
     */
    function absorbLoss(uint256 amount)
        external
        onlyRole(LENDING_POOL_ROLE)
        returns (uint256 covered)
    {
        if (lendingPool == address(0)) revert ZeroAddress();
        uint256 bal = usdc.balanceOf(address(this));
        covered = bal >= amount ? amount : bal;
        if (covered > 0) usdc.safeTransfer(lendingPool, covered);
        emit LossAbsorbed(amount, covered, bal - covered);
    }

    /**
     * @notice Deploy idle reserves to a whitelisted yield strategy. Only GOVERNOR_ROLE.
     *         Post-deploy balance must remain above minimumReserveFloor.
     * @param strategy Target strategy contract address.
     * @param amount   USDC amount to deploy.
     */
    function deployToStrategy(address strategy, uint256 amount) external onlyRole(GOVERNOR_ROLE) {
        if (!isWhitelistedStrategy[strategy]) revert UnknownStrategy();
        uint256 postBalance = usdc.balanceOf(address(this)) - amount;
        if (postBalance < minimumReserveFloor) revert BelowMinimumFloor();
        usdc.safeTransfer(strategy, amount);
        emit StrategyDeployed(strategy, amount);
    }

    /**
     * @notice Withdraw funds from a strategy back to the reserve. Only GOVERNOR_ROLE.
     * @param strategy Source strategy contract address.
     * @param amount   USDC amount to withdraw.
     */
    function withdrawFromStrategy(address strategy, uint256 amount)
        external
        onlyRole(GOVERNOR_ROLE)
    {
        if (!isWhitelistedStrategy[strategy]) revert UnknownStrategy();
        usdc.safeTransferFrom(strategy, address(this), amount);
        emit StrategyWithdrawn(strategy, amount);
    }

    /// @notice Whitelist a yield strategy. Only GOVERNOR_ROLE.
    /// @param strategy Strategy address to add.
    function addStrategy(address strategy) external onlyRole(GOVERNOR_ROLE) {
        if (strategy == address(0)) revert ZeroAddress();
        isWhitelistedStrategy[strategy] = true;
        emit StrategyAdded(strategy);
    }

    /// @notice Remove a strategy from the whitelist. Only GOVERNOR_ROLE.
    /// @param strategy Strategy address to remove.
    function removeStrategy(address strategy) external onlyRole(GOVERNOR_ROLE) {
        isWhitelistedStrategy[strategy] = false;
        emit StrategyRemoved(strategy);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns current USDC balance held in the reserve.
    function reserveBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[46] private __gap;
}
