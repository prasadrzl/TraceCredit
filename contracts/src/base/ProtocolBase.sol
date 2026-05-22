// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @notice Shared base for all protocol contracts.
///         Provides access control, UUPS upgradeability, pause, and treasury.
abstract contract ProtocolBase is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");
    bytes32 public constant GOVERNOR_ROLE   = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE   = keccak256("GUARDIAN_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ProtocolPaused();
    error ZeroAddress();

    // ── State ─────────────────────────────────────────────────────────────────
    bool    public paused;
    uint8   public version;
    address public treasury;

    // ── Events ────────────────────────────────────────────────────────────────
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier whenNotPaused() {
        if (paused) revert ProtocolPaused();
        _;
    }

    // ── Pause ─────────────────────────────────────────────────────────────────
    /// @notice Pause the contract. Only PAUSER_ROLE.
    function pause() external onlyRole(PAUSER_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the contract. Only GOVERNOR_ROLE.
    function unpause() external onlyRole(GOVERNOR_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Update the treasury address. Only GOVERNOR_ROLE.
    /// @param newTreasury New treasury address.
    function setTreasury(address newTreasury) external onlyRole(GOVERNOR_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // ── UUPS ──────────────────────────────────────────────────────────────────
    /// @dev Restricted to UPGRADER_ROLE; satisfies UUPSUpgradeable requirement.
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    // ── Internal initializer ──────────────────────────────────────────────────
    /// @dev Call from concrete initializer with onlyInitializing.
    function __ProtocolBase_init(address admin, address treasury_) internal onlyInitializing {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        if (admin    == address(0)) revert ZeroAddress();
        if (treasury_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE,  admin);
        _grantRole(GOVERNOR_ROLE,  admin);
        _grantRole(GUARDIAN_ROLE,  admin);
        _grantRole(PAUSER_ROLE,    admin);
        treasury = treasury_;
        version  = 1;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
