// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationSBT {
    // ── Events ──────────────────────────────────────────────────────────────
    event SBTMinted(address indexed wallet, uint256 tokenId);
    event SBTFrozen(address indexed wallet);
    event SBTBurned(address indexed wallet, uint256 blacklistExpiry);
    event ScoreUpdated(address indexed wallet, uint16 newScore, int16 delta);

    // ── Errors ───────────────────────────────────────────────────────────────
    error AlreadyHasSBT();
    error NoSBTFound();
    error SBTIsFrozen();
    error Blacklisted(uint256 expiry);
    error InsufficientStake();
    error Soulbound();

    // ── Core ─────────────────────────────────────────────────────────────────
    function mintSBT() external payable;
    function freezeSBT(address wallet) external;
    function burnSBT(address wallet) external;
    function updateScore(address wallet, int16 delta) external;

    // ── Views ────────────────────────────────────────────────────────────────
    function getScore(address wallet) external view returns (uint16);
    function isFrozen(address wallet) external view returns (bool);
    function isBlacklisted(address wallet) external view returns (bool);
    function hasSBT(address wallet) external view returns (bool);
}
