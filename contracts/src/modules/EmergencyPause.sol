// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IPausable} from "../interfaces/IPausable.sol";

/**
 * @notice Global circuit breaker for the protocol.
 *         PAUSER_ROLE (multisig) can halt all registered contracts in one tx.
 *         GOVERNOR_ROLE + 48h timelock is required to resume.
 *
 *         Deliberately minimal — no UUPS, no complex logic.
 *         Must remain functional even if other protocol contracts are broken.
 */
contract EmergencyPause is ProtocolBase {
    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant UNPAUSE_TIMELOCK = 48 hours;

    // ── State ─────────────────────────────────────────────────────────────────
    address[] public pausableContracts;
    uint256   public unpauseQueuedAt; // timestamp when unpause was queued; 0 = not queued

    // ── Events ────────────────────────────────────────────────────────────────
    event ProtocolHalted(address indexed triggeredBy, uint256 timestamp);
    event UnpauseQueued(address indexed by, uint256 executeAfter);
    event ProtocolUnpaused(address indexed by, uint256 timestamp);
    event PausableAdded(address indexed contractAddr);
    event PausableRemoved(address indexed contractAddr);

    // ── Errors ────────────────────────────────────────────────────────────────
    error UnpauseTimelockNotExpired(uint256 executeAfter);
    error UnpauseNotQueued();

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise EmergencyPause.
     * @param admin      Address granted all admin roles.
     * @param treasury_  Protocol treasury address.
     * @param contracts_ Initial list of pausable contract addresses.
     */
    function initialize(
        address admin,
        address treasury_,
        address[] calldata contracts_
    ) external initializer {
        __ProtocolBase_init(admin, treasury_);
        uint256 len = contracts_.length;
        for (uint256 i; i < len; ) {
            pausableContracts.push(contracts_[i]);
            unchecked { ++i; }
        }
    }

    // ── Pause ─────────────────────────────────────────────────────────────────
    /**
     * @notice Pause all registered contracts in a single transaction. Only PAUSER_ROLE.
     *         Emits ProtocolPaused; individual contract failures are caught silently
     *         so one broken contract cannot block the emergency halt.
     */
    function pauseAll() external onlyRole(PAUSER_ROLE) {
        uint256 len = pausableContracts.length;
        for (uint256 i; i < len; ) {
            try IPausable(pausableContracts[i]).pause() {} catch {}
            unchecked { ++i; }
        }
        emit ProtocolHalted(msg.sender, block.timestamp);
    }

    // ── Unpause (two-step with timelock) ─────────────────────────────────────
    /// @notice Queue an unpause. GOVERNOR_ROLE only. Must wait UNPAUSE_TIMELOCK before executing.
    function queueUnpause() external onlyRole(GOVERNOR_ROLE) {
        unpauseQueuedAt = block.timestamp;
        emit UnpauseQueued(msg.sender, block.timestamp + UNPAUSE_TIMELOCK);
    }

    /**
     * @notice Execute the queued unpause after the timelock expires. GOVERNOR_ROLE only.
     *         Unpauses all registered contracts.
     */
    function unpauseAll() external onlyRole(GOVERNOR_ROLE) {
        if (unpauseQueuedAt == 0) revert UnpauseNotQueued();
        if (block.timestamp < unpauseQueuedAt + UNPAUSE_TIMELOCK) {
            revert UnpauseTimelockNotExpired(unpauseQueuedAt + UNPAUSE_TIMELOCK);
        }
        unpauseQueuedAt = 0;

        uint256 len = pausableContracts.length;
        for (uint256 i; i < len; ) {
            try IPausable(pausableContracts[i]).unpause() {} catch {}
            unchecked { ++i; }
        }
        emit ProtocolUnpaused(msg.sender, block.timestamp);
    }

    // ── Registry management ───────────────────────────────────────────────────
    /// @notice Register a pausable contract. Only GOVERNOR_ROLE.
    /// @param contractAddr Address of the contract to register.
    function addPausable(address contractAddr) external onlyRole(GOVERNOR_ROLE) {
        if (contractAddr == address(0)) revert ZeroAddress();
        pausableContracts.push(contractAddr);
        emit PausableAdded(contractAddr);
    }

    /// @notice Remove a pausable contract by index. Only GOVERNOR_ROLE.
    /// @param index Index in the pausableContracts array to remove.
    function removePausable(uint256 index) external onlyRole(GOVERNOR_ROLE) {
        uint256 len = pausableContracts.length;
        require(index < len, "Out of bounds");
        address removed = pausableContracts[index];
        pausableContracts[index] = pausableContracts[len - 1];
        pausableContracts.pop();
        emit PausableRemoved(removed);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
