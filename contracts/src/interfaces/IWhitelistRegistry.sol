// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for WhitelistRegistry — sanctions and geo-block enforcement gate.
interface IWhitelistRegistry {
    // ── Events ────────────────────────────────────────────────────────────────
    event AddressBlocked(address indexed wallet);
    event AddressUnblocked(address indexed wallet);
    event CountryBlocked(bytes2 indexed countryCode);
    event CountryUnblocked(bytes2 indexed countryCode);

    // ── Errors ────────────────────────────────────────────────────────────────
    error TimelockPending(uint256 unlockAt);

    // ── Mutative ──────────────────────────────────────────────────────────────
    /// @notice Block an address. COMPLIANCE_ROLE + timelock.
    /// @param wallet Address to block.
    function blockAddress(address wallet) external;

    /// @notice Unblock an address. COMPLIANCE_ROLE + timelock.
    /// @param wallet Address to unblock.
    function unblockAddress(address wallet) external;

    /// @notice Block a country. COMPLIANCE_ROLE + timelock.
    /// @param countryCode ISO 3166-1 alpha-2 code (e.g. bytes2("US")).
    function blockCountry(bytes2 countryCode) external;

    /// @notice Unblock a country. COMPLIANCE_ROLE + timelock.
    /// @param countryCode ISO 3166-1 alpha-2 code.
    function unblockCountry(bytes2 countryCode) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /**
     * @notice Returns true if the wallet is permitted to borrow.
     *         Returns false if the address is blocked or the country code is geo-blocked.
     *         Country code is passed by the frontend; V2 will integrate a Chainalysis oracle.
     * @param wallet      Address to check.
     * @param countryCode Two-letter country code for the requester.
     */
    function isAllowed(address wallet, bytes2 countryCode) external view returns (bool);

    /// @notice Returns true if the address is blocked.
    function blocked(address wallet) external view returns (bool);

    /// @notice Returns true if the country code is geo-blocked.
    function geoBlocked(bytes2 countryCode) external view returns (bool);
}
