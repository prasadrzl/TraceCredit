// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Byte32 key constants for ProtocolRegistry lookups.
///         Import this library wherever a registry key is needed.
library RegistryKeys {
    bytes32 internal constant REPUTATION_SBT          = keccak256("REPUTATION_SBT");
    bytes32 internal constant SCORE_ENGINE             = keccak256("SCORE_ENGINE");
    bytes32 internal constant LENDING_POOL             = keccak256("LENDING_POOL");
    bytes32 internal constant RESERVE_MODULE           = keccak256("RESERVE_MODULE");
    bytes32 internal constant ATTESTATION_BRIDGE       = keccak256("ATTESTATION_BRIDGE");
    bytes32 internal constant CREDIT_LINE_MANAGER      = keccak256("CREDIT_LINE_MANAGER");
    bytes32 internal constant INTEREST_ACCRUAL_ENGINE  = keccak256("INTEREST_ACCRUAL_ENGINE");
    bytes32 internal constant LIQUIDATION_MANAGER      = keccak256("LIQUIDATION_MANAGER");
    bytes32 internal constant WHITELIST_REGISTRY       = keccak256("WHITELIST_REGISTRY");
    bytes32 internal constant FEE_COLLECTOR            = keccak256("FEE_COLLECTOR");
    bytes32 internal constant EMERGENCY_PAUSE          = keccak256("EMERGENCY_PAUSE");
    bytes32 internal constant RATE_LIMITER             = keccak256("RATE_LIMITER");
    bytes32 internal constant SBT_STAKE_VAULT          = keccak256("SBT_STAKE_VAULT");
}
