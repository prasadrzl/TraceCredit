// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IProtocolRegistry} from "../interfaces/IProtocolRegistry.sol";

/**
 * @notice Single address book for all protocol contracts.
 *         When any contract is upgraded, only one setAddress() call is needed.
 *         All other contracts resolve their siblings at runtime via getAddress().
 */
contract ProtocolRegistry is ProtocolBase, IProtocolRegistry {
    // ── State ─────────────────────────────────────────────────────────────────
    mapping(bytes32 => address) private _contracts;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the ProtocolRegistry.
     * @param admin     Address granted all admin roles.
     * @param treasury_ Protocol treasury address.
     */
    function initialize(address admin, address treasury_) external initializer {
        __ProtocolBase_init(admin, treasury_);
    }

    // ── IProtocolRegistry ─────────────────────────────────────────────────────
    /**
     * @notice Register or update a contract address. Only GOVERNOR_ROLE.
     * @param name bytes32 key — use RegistryKeys constants.
     * @param addr Address to register.
     */
    function setAddress(bytes32 name, address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        _contracts[name] = addr;
        emit ContractRegistered(name, addr);
    }

    /**
     * @notice Retrieve a registered contract address. Reverts with UnknownContract if not set.
     * @param name bytes32 key.
     * @return addr The registered address.
     */
    function getAddress(bytes32 name) external view returns (address addr) {
        addr = _contracts[name];
        if (addr == address(0)) revert UnknownContract(name);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[49] private __gap;
}
