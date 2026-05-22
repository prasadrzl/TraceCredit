// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal pausable interface used by EmergencyPause to halt contracts.
interface IPausable {
    /// @notice Pause the contract.
    function pause() external;

    /// @notice Unpause the contract.
    function unpause() external;
}
