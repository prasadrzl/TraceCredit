// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-5192 interface — soulbound token standard.
interface IERC5192 {
    /// @notice Emitted when the locking status changes.
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);

    /// @notice Returns true if the token is locked (non-transferable).
    function locked(uint256 tokenId) external view returns (bool);
}
