// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IWhitelistRegistry} from "../interfaces/IWhitelistRegistry.sol";

/**
 * @notice Single enforcement point for sanctions and geo-block compliance.
 *         LendingPool calls isAllowed(borrower, countryCode) as the first check
 *         in borrow(). The DAO governs additions via a timelock to prevent
 *         censorship abuse.
 *
 *         V1: country code is passed by the frontend.
 *         V2: will integrate a Chainalysis oracle directly.
 */
contract WhitelistRegistry is ProtocolBase, IWhitelistRegistry {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant TIMELOCK_DELAY = 48 hours;

    // ── State ─────────────────────────────────────────────────────────────────
    mapping(address => bool)  private _blocked;
    mapping(bytes2  => bool)  private _geoBlocked;

    /*
     * Pending actions are stored with a timestamp. Execution is only allowed
     * once TIMELOCK_DELAY has elapsed.
     */
    mapping(bytes32 => uint256) public pendingAt;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the WhitelistRegistry.
     * @param admin     Address granted all admin roles.
     * @param treasury_ Protocol treasury address.
     */
    function initialize(address admin, address treasury_) external initializer {
        __ProtocolBase_init(admin, treasury_);
        _grantRole(COMPLIANCE_ROLE, admin);
    }

    // ── IWhitelistRegistry mutative ───────────────────────────────────────────
    /**
     * @notice Queue (first call) or execute (second call after delay) an address block.
     *         COMPLIANCE_ROLE only. First call commits the queue and returns; second call
     *         after TIMELOCK_DELAY executes the block. Reverts TimelockPending if called
     *         again before the delay has elapsed.
     * @param wallet Address to block.
     */
    function blockAddress(address wallet) external onlyRole(COMPLIANCE_ROLE) {
        bytes32 key = keccak256(abi.encodePacked("BLOCK_ADDR", wallet));
        if (!_executeOrQueue(key)) return;
        _blocked[wallet] = true;
        delete pendingAt[key];
        emit AddressBlocked(wallet);
    }

    /// @notice Queue (first call) or execute (second call after delay) an address unblock.
    /// @param wallet Address to unblock.
    function unblockAddress(address wallet) external onlyRole(COMPLIANCE_ROLE) {
        bytes32 key = keccak256(abi.encodePacked("UNBLOCK_ADDR", wallet));
        if (!_executeOrQueue(key)) return;
        _blocked[wallet] = false;
        delete pendingAt[key];
        emit AddressUnblocked(wallet);
    }

    /// @notice Queue (first call) or execute (second call after delay) a country block.
    /// @param countryCode ISO 3166-1 alpha-2 country code.
    function blockCountry(bytes2 countryCode) external onlyRole(COMPLIANCE_ROLE) {
        bytes32 key = keccak256(abi.encodePacked("BLOCK_COUNTRY", countryCode));
        if (!_executeOrQueue(key)) return;
        _geoBlocked[countryCode] = true;
        delete pendingAt[key];
        emit CountryBlocked(countryCode);
    }

    /// @notice Queue (first call) or execute (second call after delay) a country unblock.
    /// @param countryCode ISO 3166-1 alpha-2 country code.
    function unblockCountry(bytes2 countryCode) external onlyRole(COMPLIANCE_ROLE) {
        bytes32 key = keccak256(abi.encodePacked("UNBLOCK_COUNTRY", countryCode));
        if (!_executeOrQueue(key)) return;
        _geoBlocked[countryCode] = false;
        delete pendingAt[key];
        emit CountryUnblocked(countryCode);
    }

    // ── IWhitelistRegistry views ──────────────────────────────────────────────
    /**
     * @notice Returns true if the wallet is permitted to borrow.
     * @param wallet      Address to check.
     * @param countryCode Two-letter country code supplied by the frontend.
     */
    function isAllowed(address wallet, bytes2 countryCode) external view returns (bool) {
        return !_blocked[wallet] && !_geoBlocked[countryCode];
    }

    /// @notice Returns true if the address is blocked.
    function blocked(address wallet) external view returns (bool) {
        return _blocked[wallet];
    }

    /// @notice Returns true if the country code is geo-blocked.
    function geoBlocked(bytes2 countryCode) external view returns (bool) {
        return _geoBlocked[countryCode];
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    /**
     * @dev Queue action if not already queued. Returns true when ready to execute.
     *      Reverts with TimelockPending if queued but the delay has not elapsed.
     *      On first call: commits queue and reverts so callers can distinguish queue from execute.
     *      Uses a separate internal commit so the pending state is set before the revert.
     */
    function _executeOrQueue(bytes32 key) internal returns (bool) {
        if (pendingAt[key] == 0) {
            pendingAt[key] = block.timestamp;
            return false;
        }
        if (!_isReady(key)) {
            revert TimelockPending(pendingAt[key] + TIMELOCK_DELAY);
        }
        return true;
    }

    function _isReady(bytes32 key) internal view returns (bool) {
        return block.timestamp >= pendingAt[key] + TIMELOCK_DELAY;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
