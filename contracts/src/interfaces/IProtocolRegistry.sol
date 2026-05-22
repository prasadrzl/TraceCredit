// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Single address book for all protocol contracts.
interface IProtocolRegistry {
    // ── Events ────────────────────────────────────────────────────────────────
    event ContractRegistered(bytes32 indexed name, address indexed addr);

    // ── Errors ────────────────────────────────────────────────────────────────
    error UnknownContract(bytes32 name);

    // ── Mutative ──────────────────────────────────────────────────────────────
    /**
     * @notice Register or update a contract address. Only GOVERNOR_ROLE.
     * @param name bytes32 key — use RegistryKeys constants.
     * @param addr Address of the contract to register.
     */
    function setAddress(bytes32 name, address addr) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /**
     * @notice Retrieve a registered contract address by key.
     * @param name bytes32 key.
     * @return addr The registered address.
     */
    function getAddress(bytes32 name) external view returns (address addr);
}
