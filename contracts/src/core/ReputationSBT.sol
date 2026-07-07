// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ScorableBase} from "../base/ScorableBase.sol";
import {IReputationSBT} from "../interfaces/IReputationSBT.sol";
import {ISBTStakeVault} from "../interfaces/ISBTStakeVault.sol";
import {IERC5192} from "../interfaces/IERC5192.sol";

/**
 * @notice ERC-5192 Soulbound Token — one per wallet, non-transferable.
 *         Stores the borrower's on-chain reputation score (0–1000).
 *         Mint requires a USDC stake held in SBTStakeVault.
 *         Burn writes a 24-month blacklist entry before deleting the token.
 */
contract ReputationSBT is ERC721Upgradeable, ScorableBase, IReputationSBT {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant SCORE_ENGINE_ROLE = keccak256("SCORE_ENGINE_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant BLACKLIST_DURATION = 730 days;
    uint16  public constant MAX_SCORE          = 1000;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 private _nextTokenId;
    address public  stakeVault;

    struct SBTData {
        uint16  score;
        bool    frozen;
        uint256 blacklistedUntil;
    }

    mapping(address => uint256)  private _walletToken;
    mapping(uint256 => SBTData)  private _tokenData;
    // Blacklist keyed by wallet so it survives the deletion of _walletToken on burn
    mapping(address => uint256)  private _blacklistExpiry;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the contract (called once via proxy).
     * @param admin      Address granted all admin roles.
     * @param treasury_  Protocol treasury address.
     * @param stakeVault_ SBTStakeVault address for USDC stake management.
     */
    function initialize(address admin, address treasury_, address stakeVault_)
        external
        initializer
    {
        __ERC721_init("TraceCredit Reputation", "TCREP");
        __ProtocolBase_init(admin, treasury_);
        if (stakeVault_ == address(0)) revert ZeroAddress();
        stakeVault = stakeVault_;
    }

    // ── ERC-5192 ──────────────────────────────────────────────────────────────
    /// @notice Always returns true — all SBTs are permanently locked.
    function locked(uint256 /*tokenId*/) external pure returns (bool) {
        return true;
    }

    // ── Mint ──────────────────────────────────────────────────────────────────
    /// @notice Mint an SBT for the caller. Pulls the required USDC stake via SBTStakeVault.
    function mintSBT() external whenNotPaused {
        address wallet = msg.sender;
        if (_walletToken[wallet] != 0) revert AlreadyHasSBT();
        if (_isBlacklisted(wallet))    revert Blacklisted(_blacklistExpiry[wallet]);

        ISBTStakeVault(stakeVault).deposit(wallet);

        uint256 tokenId = ++_nextTokenId;
        _walletToken[wallet]  = tokenId;
        _tokenData[tokenId]   = SBTData({score: 0, frozen: false, blacklistedUntil: 0});
        _safeMint(wallet, tokenId);

        emit SBTMinted(wallet, tokenId);
    }

    // ── Guardian actions ──────────────────────────────────────────────────────
    /// @notice Freeze an SBT, blocking new borrows. Only GUARDIAN_ROLE.
    /// @param wallet Address whose SBT to freeze.
    function freezeSBT(address wallet) external onlyRole(GUARDIAN_ROLE) {
        uint256 tokenId = _requireToken(wallet);
        _tokenData[tokenId].frozen = true;
        emit SBTFrozen(wallet);
    }

    /// @notice Unfreeze a previously frozen SBT. Only GUARDIAN_ROLE.
    /// @param wallet Address whose SBT to unfreeze.
    function unfreezeSBT(address wallet) external onlyRole(GUARDIAN_ROLE) {
        uint256 tokenId = _requireToken(wallet);
        _tokenData[tokenId].frozen = false;
        emit SBTUnfrozen(wallet);
    }

    /**
     * @notice Burn an SBT and blacklist the wallet for 24 months. Only GUARDIAN_ROLE.
     *         Blacklist entry is written before the token is deleted to prevent
     *         the wallet from immediately re-minting.
     * @param wallet Address whose SBT to burn.
     */
    function burnSBT(address wallet) external onlyRole(GUARDIAN_ROLE) {
        uint256 tokenId = _requireToken(wallet);
        uint256 expiry  = block.timestamp + BLACKLIST_DURATION;
        // Write blacklist by wallet address BEFORE deleting _walletToken so
        // _isBlacklisted can find it even after the token mapping is cleared.
        _blacklistExpiry[wallet] = expiry;
        _burn(tokenId);
        delete _walletToken[wallet];
        emit SBTBurned(wallet, expiry);
    }

    // ── Score ─────────────────────────────────────────────────────────────────
    /**
     * @notice Apply a signed score delta. Result clamped to [0, 1000].
     *         Only SCORE_ENGINE_ROLE.
     * @param wallet Target wallet.
     * @param delta  Signed delta to apply.
     */
    function updateScore(address wallet, int16 delta) external onlyRole(SCORE_ENGINE_ROLE) {
        uint256 tokenId = _requireToken(wallet);
        if (_tokenData[tokenId].frozen) revert SBTIsFrozen();

        int32 current  = int32(uint32(_tokenData[tokenId].score));
        int32 updated  = current + int32(delta);
        uint16 clamped = uint16(uint32(_clamp(updated, 0, int32(uint32(MAX_SCORE)))));
        _tokenData[tokenId].score = clamped;

        emit ScoreUpdated(wallet, clamped, delta);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the reputation score for a wallet (0–1000).
    function getScore(address wallet) external view returns (uint16) {
        return _tokenData[_walletToken[wallet]].score;
    }

    /// @notice Returns true if the SBT is frozen.
    function isFrozen(address wallet) external view returns (bool) {
        return _tokenData[_walletToken[wallet]].frozen;
    }

    /// @notice Returns true if the wallet is currently blacklisted.
    function isBlacklisted(address wallet) external view returns (bool) {
        return _isBlacklisted(wallet);
    }

    /// @notice Returns true if the wallet holds an SBT.
    function hasSBT(address wallet) external view returns (bool) {
        return _walletToken[wallet] != 0;
    }

    // ── ScorableBase virtuals ─────────────────────────────────────────────────
    function _getTier(address /*wallet*/) internal pure override returns (uint8) {
        // Tier resolution belongs to ScoreEngine; SBT does not compute tiers.
        return 0;
    }

    // ── Soulbound transfer guard ──────────────────────────────────────────────
    /// @dev Reverts any transfer except minting (from == address(0)).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // ── Internals ─────────────────────────────────────────────────────────────
    function _requireToken(address wallet) internal view returns (uint256 tokenId) {
        tokenId = _walletToken[wallet];
        if (tokenId == 0) revert NoSBTFound();
    }

    function _isBlacklisted(address wallet) internal view returns (bool) {
        uint256 tokenId = _walletToken[wallet];
        if (tokenId == 0) return false;
        return _tokenData[tokenId].blacklistedUntil > block.timestamp;
    }

    function _clamp(int32 val, int32 lo, int32 hi) internal pure returns (int32) {
        if (val < lo) return lo;
        if (val > hi) return hi;
        return val;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[46] private __gap;
}
