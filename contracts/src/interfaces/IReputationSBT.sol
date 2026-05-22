// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the ERC-5192 Soulbound Token that stores reputation scores.
interface IReputationSBT {
    // ── Events ────────────────────────────────────────────────────────────────
    event SBTMinted(address indexed wallet, uint256 tokenId);
    event SBTFrozen(address indexed wallet);
    event SBTUnfrozen(address indexed wallet);
    event SBTBurned(address indexed wallet, uint256 blacklistExpiry);
    event ScoreUpdated(address indexed wallet, uint16 newScore, int16 delta);

    // ── Errors ────────────────────────────────────────────────────────────────
    error AlreadyHasSBT();
    error NoSBTFound();
    error SBTIsFrozen();
    error Blacklisted(uint256 expiry);
    error InsufficientStake();
    error Soulbound();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /// @notice Mint an SBT for the caller. Requires USDC stake via SBTStakeVault.
    function mintSBT() external;

    /// @notice Freeze an SBT. Only GUARDIAN_ROLE.
    /// @param wallet Address whose SBT to freeze.
    function freezeSBT(address wallet) external;

    /// @notice Unfreeze an SBT. Only GUARDIAN_ROLE.
    /// @param wallet Address whose SBT to unfreeze.
    function unfreezeSBT(address wallet) external;

    /// @notice Burn an SBT and record a 24-month blacklist. Only GUARDIAN_ROLE.
    /// @param wallet Address whose SBT to burn.
    function burnSBT(address wallet) external;

    /**
     * @notice Apply a signed score delta. Only SCORE_ENGINE_ROLE.
     * @param wallet Target wallet.
     * @param delta  Signed delta; result clamped to [0, 1000].
     */
    function updateScore(address wallet, int16 delta) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the reputation score for wallet (0–1000).
    function getScore(address wallet) external view returns (uint16);

    /// @notice Returns true if the SBT is frozen.
    function isFrozen(address wallet) external view returns (bool);

    /// @notice Returns true if the wallet is blacklisted.
    function isBlacklisted(address wallet) external view returns (bool);

    /// @notice Returns true if wallet holds an SBT.
    function hasSBT(address wallet) external view returns (bool);

    /// @notice ERC-5192: always returns true (tokens are locked).
    function locked(uint256 tokenId) external pure returns (bool);
}
