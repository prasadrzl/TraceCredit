// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "./ProtocolBase.sol";
import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice ERC-4626 vault shell extended with lending-specific hooks.
///         Only LendingPool inherits this.
abstract contract VaultBase is ProtocolBase, ERC4626Upgradeable, ReentrancyGuardUpgradeable {
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public totalDeposited;
    uint16  public reserveFactor; // basis points, e.g. 1500 = 15 %

    // ── Events ────────────────────────────────────────────────────────────────
    event ReserveFactorUpdated(uint16 oldFactor, uint16 newFactor);

    // ── Governance ────────────────────────────────────────────────────────────
    /// @notice Update the reserve factor. Only GOVERNOR_ROLE.
    /// @param newFactor New reserve factor in basis points (max 5000).
    function setReserveFactor(uint16 newFactor) external onlyRole(GOVERNOR_ROLE) {
        require(newFactor <= 5_000, "RF too high");
        emit ReserveFactorUpdated(reserveFactor, newFactor);
        reserveFactor = newFactor;
    }

    // ── Virtual hooks ─────────────────────────────────────────────────────────
    /// @dev Called before assets enter the vault.
    function _beforeDeposit(address caller, uint256 assets) internal virtual {}

    /// @dev Called after assets leave the vault.
    function _afterWithdraw(address caller, uint256 assets) internal virtual {}

    /// @dev Returns the borrow rate in bps for a given utilization (1e18 scale).
    function _calcInterestRate(uint256 utilization) internal view virtual returns (uint256 annualRateBps);

    // ── ERC-4626 overrides ────────────────────────────────────────────────────
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        _beforeDeposit(caller, assets);
        totalDeposited += assets;
        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        super._withdraw(caller, receiver, owner, assets, shares);
        if (totalDeposited >= assets) {
            unchecked { totalDeposited -= assets; } // safe: checked above
        } else {
            totalDeposited = 0;
        }
        _afterWithdraw(caller, assets);
    }

    // ── Internal initializer ──────────────────────────────────────────────────
    function __VaultBase_init(IERC20 asset_, string memory name_, string memory symbol_, uint16 reserveFactor_)
        internal
        onlyInitializing
    {
        __ERC4626_init(asset_);
        __ERC20_init(name_, symbol_);
        __ReentrancyGuard_init();
        reserveFactor = reserveFactor_;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
