// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IReputationSBT} from "../interfaces/IReputationSBT.sol";

/// @notice ERC-5192 Soulbound Token — one per wallet, non-transferable.
///         Stores the borrower's reputation score (0–1000).
contract ReputationSBT is ERC721, AccessControl, IReputationSBT {
    bytes32 public constant SCORE_UPDATER_ROLE = keccak256("SCORE_UPDATER");
    bytes32 public constant GUARDIAN_ROLE      = keccak256("GUARDIAN");

    uint256 public constant MIN_STAKE          = 50e6;  // 50 USDC (6 dp)
    uint256 public constant BLACKLIST_DURATION = 730 days;
    uint16  public constant MAX_SCORE          = 1000;

    uint256 private _nextTokenId;

    struct SBTData {
        uint16  score;
        bool    frozen;
        uint256 blacklistedUntil;
        uint256 mintedAt;
    }

    mapping(address => uint256)  private _walletToken;
    mapping(uint256 => SBTData)  private _data;

    constructor(address admin) ERC721("TraceCredit Reputation", "TCREP") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ── ERC-5192: locked ────────────────────────────────────────────────────
    function locked(uint256 /*tokenId*/) external pure returns (bool) {
        return true;
    }

    // ── Mint ────────────────────────────────────────────────────────────────
    function mintSBT() external payable {
        address wallet = msg.sender;
        if (_walletToken[wallet] != 0) revert AlreadyHasSBT();
        if (isBlacklisted(wallet)) revert Blacklisted(_data[_walletToken[wallet]].blacklistedUntil);
        // TODO: accept USDC stake via ERC-20 transfer; msg.value placeholder for native
        if (msg.value < MIN_STAKE) revert InsufficientStake();

        uint256 tokenId = ++_nextTokenId;
        _walletToken[wallet] = tokenId;
        _data[tokenId] = SBTData({score: 0, frozen: false, blacklistedUntil: 0, mintedAt: block.timestamp});
        _safeMint(wallet, tokenId);

        emit SBTMinted(wallet, tokenId);
    }

    // ── Guardian: freeze / burn ─────────────────────────────────────────────
    function freezeSBT(address wallet) external onlyRole(GUARDIAN_ROLE) {
        uint256 tokenId = _requireSBT(wallet);
        _data[tokenId].frozen = true;
        emit SBTFrozen(wallet);
    }

    function burnSBT(address wallet) external onlyRole(GUARDIAN_ROLE) {
        uint256 tokenId = _requireSBT(wallet);
        _data[tokenId].blacklistedUntil = block.timestamp + BLACKLIST_DURATION;
        _burn(tokenId);
        delete _walletToken[wallet];
        emit SBTBurned(wallet, block.timestamp + BLACKLIST_DURATION);
    }

    // ── Score ───────────────────────────────────────────────────────────────
    function updateScore(address wallet, int16 delta) external onlyRole(SCORE_UPDATER_ROLE) {
        uint256 tokenId = _requireSBT(wallet);
        if (_data[tokenId].frozen) revert SBTIsFrozen();

        int32 current = int32(uint32(_data[tokenId].score));
        int32 updated = current + int32(delta);
        uint16 newScore = uint16(uint32(_clamp(updated, 0, int32(uint32(MAX_SCORE)))));
        _data[tokenId].score = newScore;

        emit ScoreUpdated(wallet, newScore, delta);
    }

    // ── Views ────────────────────────────────────────────────────────────────
    function getScore(address wallet) external view returns (uint16) {
        return _data[_walletToken[wallet]].score;
    }

    function isFrozen(address wallet) external view returns (bool) {
        return _data[_walletToken[wallet]].frozen;
    }

    function isBlacklisted(address wallet) public view returns (bool) {
        return _data[_walletToken[wallet]].blacklistedUntil > block.timestamp;
    }

    function hasSBT(address wallet) external view returns (bool) {
        return _walletToken[wallet] != 0;
    }

    // ── Soulbound: block transfers ───────────────────────────────────────────
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // ── Internals ───────────────────────────────────────────────────────────
    function _requireSBT(address wallet) internal view returns (uint256 tokenId) {
        tokenId = _walletToken[wallet];
        if (tokenId == 0) revert NoSBTFound();
    }

    function _clamp(int32 val, int32 lo, int32 hi) internal pure returns (int32) {
        if (val < lo) return lo;
        if (val > hi) return hi;
        return val;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
