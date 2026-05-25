// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {IWhitelistRegistry} from "../../src/interfaces/IWhitelistRegistry.sol";

contract WhitelistRegistryTest is DeployHelper {

    address internal alice = makeAddr("alice");
    bytes2  internal constant US = 0x5553; // "US"

    function setUp() public {
        _deploy();
    }

    // ── isAllowed ─────────────────────────────────────────────────────────────

    function test_isAllowed_defaultAllowed() public view {
        assertTrue(whitelist.isAllowed(alice, US));
    }

    // ── blockAddress timelock ─────────────────────────────────────────────────

    function test_blockAddress_queuesOnFirstCall() public {
        // First call: silently queues, does NOT revert
        vm.prank(admin);
        whitelist.blockAddress(alice);
        assertFalse(whitelist.blocked(alice), "not blocked yet - still in timelock");
        assertGt(whitelist.pendingAt(keccak256(abi.encodePacked("BLOCK_ADDR", alice))), 0, "queued");
    }

    function test_blockAddress_revertsIfCalledBeforeDelay() public {
        // Queue it
        vm.prank(admin);
        whitelist.blockAddress(alice);

        // Immediate retry should revert with TimelockPending
        vm.expectRevert();
        vm.prank(admin);
        whitelist.blockAddress(alice);
    }

    function test_blockAddress_executesAfterDelay() public {
        // First call — queues (no revert)
        vm.prank(admin);
        whitelist.blockAddress(alice);

        // Warp past timelock
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);

        // Second call — executes
        vm.prank(admin);
        whitelist.blockAddress(alice);
        assertTrue(whitelist.blocked(alice));
        assertFalse(whitelist.isAllowed(alice, bytes2(0)));
    }

    function test_blockAddress_onlyCompliance() public {
        vm.expectRevert();
        vm.prank(alice);
        whitelist.blockAddress(alice);
    }

    // ── unblockAddress ────────────────────────────────────────────────────────

    function test_unblockAddress_afterTimelock() public {
        // Block alice (queue + execute)
        vm.prank(admin);
        whitelist.blockAddress(alice);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.blockAddress(alice);
        assertTrue(whitelist.blocked(alice));

        // Unblock alice (queue + execute)
        vm.prank(admin);
        whitelist.unblockAddress(alice);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.unblockAddress(alice);
        assertFalse(whitelist.blocked(alice));
    }

    // ── blockCountry / unblockCountry ─────────────────────────────────────────

    function test_blockCountry_success() public {
        // Queue
        vm.prank(admin);
        whitelist.blockCountry(US);
        assertFalse(whitelist.geoBlocked(US), "not yet blocked");

        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);

        // Execute
        vm.prank(admin);
        whitelist.blockCountry(US);

        assertTrue(whitelist.geoBlocked(US));
        assertFalse(whitelist.isAllowed(alice, US));
    }

    function test_unblockCountry_success() public {
        // Block
        vm.prank(admin); whitelist.blockCountry(US);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin); whitelist.blockCountry(US);

        // Unblock
        vm.prank(admin); whitelist.unblockCountry(US);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin); whitelist.unblockCountry(US);
        assertFalse(whitelist.geoBlocked(US));
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    /// @dev Any wallet address can be blocked through the timelock — none are special-cased.
    function testFuzz_anyAddressBlockable(address wallet) public {
        vm.assume(wallet != address(0));
        // Queue
        vm.prank(admin);
        whitelist.blockAddress(wallet);
        assertFalse(whitelist.blocked(wallet));

        // Execute after delay
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.blockAddress(wallet);

        assertTrue(whitelist.blocked(wallet));
        assertFalse(whitelist.isAllowed(wallet, bytes2(0)));
    }

    /// @dev Any 2-byte country code can be geo-blocked through the timelock.
    function testFuzz_anyCountryBlockable(bytes2 code) public {
        vm.prank(admin);
        whitelist.blockCountry(code);

        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.blockCountry(code);

        assertTrue(whitelist.geoBlocked(code));
        assertFalse(whitelist.isAllowed(alice, code));
    }

    /// @dev Retrying before the delay has elapsed always reverts regardless of wait time.
    function testFuzz_blockAddress_revertsIfBeforeDelay(uint256 elapsed) public {
        uint256 delay = whitelist.TIMELOCK_DELAY();
        vm.assume(elapsed < delay);

        vm.prank(admin);
        whitelist.blockAddress(alice);

        vm.warp(block.timestamp + elapsed);

        vm.expectRevert();
        vm.prank(admin);
        whitelist.blockAddress(alice);

        assertFalse(whitelist.blocked(alice));
    }

    // ── Pause ─────────────────────────────────────────────────────────────────

    function test_pause_preventsWrite() public {
        vm.prank(admin);
        whitelist.pause();
        // isAllowed is a view — still works when paused
        assertTrue(whitelist.isAllowed(alice, US));
    }
}
