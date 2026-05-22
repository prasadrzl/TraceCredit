// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "./ProtocolBase.sol";
import {IReputationSBT} from "../interfaces/IReputationSBT.sol";

/// @notice Drop-in mixin for any contract that reads reputation scores.
///         Stores SBT and ScoreEngine addresses; exposes virtual score hooks.
abstract contract ScorableBase is ProtocolBase {
    // ── State ─────────────────────────────────────────────────────────────────
    address public sbtContract;
    address public scoreEngine;

    // ── Events ────────────────────────────────────────────────────────────────
    event SbtContractUpdated(address indexed oldAddr, address indexed newAddr);
    event ScoreEngineUpdated(address indexed oldAddr, address indexed newAddr);

    // ── Governance setters ────────────────────────────────────────────────────
    /// @notice Update the SBT contract address. Only GOVERNOR_ROLE.
    /// @param addr New SBT contract address.
    function setSbtContract(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        emit SbtContractUpdated(sbtContract, addr);
        sbtContract = addr;
    }

    /// @notice Update the ScoreEngine address. Only GOVERNOR_ROLE.
    /// @param addr New ScoreEngine address.
    function setScoreEngine(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        emit ScoreEngineUpdated(scoreEngine, addr);
        scoreEngine = addr;
    }

    // ── Virtual hooks ─────────────────────────────────────────────────────────
    /**
     * @dev Default reads score from IReputationSBT. Override in concrete if needed.
     * @param wallet Address to query.
     * @return score Current score (0–1000).
     */
    function _getScore(address wallet) internal view virtual returns (uint16 score) {
        return IReputationSBT(sbtContract).getScore(wallet);
    }

    /**
     * @dev Override in concrete to return the wallet's credit tier as uint8.
     * @param wallet Address to query.
     * @return tier Tier value (0=Bronze … 4=Diamond).
     */
    function _getTier(address wallet) internal view virtual returns (uint8 tier);

    // ── Internal initializer ──────────────────────────────────────────────────
    function __ScorableBase_init(address sbt, address engine) internal onlyInitializing {
        sbtContract = sbt;
        scoreEngine = engine;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[48] private __gap;
}
