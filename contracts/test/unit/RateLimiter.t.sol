// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {IRateLimiter} from "../../src/interfaces/IRateLimiter.sol";

contract RateLimiterTest is DeployHelper {

    address internal alice      = makeAddr("alice");
    address internal poolCaller = makeAddr("poolCaller");

    bytes32 internal LP_ROLE;

    function setUp() public {
        _deploy();
        LP_ROLE = rateLimiter.LENDING_POOL_ROLE();
        vm.startPrank(admin);
        rateLimiter.grantRole(LP_ROLE, poolCaller);
        vm.stopPrank();
    }

    // ── checkAndRecord ────────────────────────────────────────────────────────

    function test_checkAndRecord_silverTier() public {
        uint256 cap = rateLimiter.dailyLimit(1);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap, 1);
        assertEq(rateLimiter.remaining(alice, 1), 0);
    }

    function test_checkAndRecord_revertsWhenExceeded() public {
        uint256 cap = rateLimiter.dailyLimit(1);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap, 1);

        vm.expectRevert();
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, 1, 1);
    }

    function test_checkAndRecord_resetsAfterWindow() public {
        uint256 cap = rateLimiter.dailyLimit(1);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap, 1);

        vm.warp(block.timestamp + rateLimiter.WINDOW_DURATION() + 1);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap, 1);
    }

    function test_checkAndRecord_onlyLendingPool() public {
        vm.expectRevert();
        vm.prank(alice);
        rateLimiter.checkAndRecord(alice, 100e6, 1);
    }

    function test_checkAndRecord_windowReset_emitsEvent() public {
        uint256 cap = rateLimiter.dailyLimit(2);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap / 2, 2);

        vm.warp(block.timestamp + rateLimiter.WINDOW_DURATION() + 1);

        vm.expectEmit(true, false, false, false);
        emit IRateLimiter.WindowReset(alice, block.timestamp);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, 1e6, 2);
    }

    // ── remaining ─────────────────────────────────────────────────────────────

    function test_remaining_fullAfterWindowReset() public {
        uint256 cap = rateLimiter.dailyLimit(2);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap, 2);

        vm.warp(block.timestamp + rateLimiter.WINDOW_DURATION() + 1);
        assertEq(rateLimiter.remaining(alice, 2), cap);
    }

    function test_remaining_decreasesWithBorrow() public {
        uint256 borrow = 100e6;
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, borrow, 1);
        assertEq(rateLimiter.remaining(alice, 1), rateLimiter.dailyLimit(1) - borrow);
    }

    function test_remaining_zeroWhenCapExhausted() public {
        uint256 cap = rateLimiter.dailyLimit(1);
        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, cap, 1);
        assertEq(rateLimiter.remaining(alice, 1), 0);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function test_setDailyLimit_success() public {
        vm.prank(admin);
        rateLimiter.setDailyLimit(4, 50_000e6);
        assertEq(rateLimiter.dailyLimit(4), 50_000e6);
    }

    function test_setDailyLimit_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(alice);
        rateLimiter.setDailyLimit(4, 50_000e6);
    }

    function test_setDailyLimit_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit IRateLimiter.DailyLimitUpdated(4, 50_000e6);
        vm.prank(admin);
        rateLimiter.setDailyLimit(4, 50_000e6);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_checkAndRecord_neverExceedsCap(uint128 amount, uint8 tier) public {
        vm.assume(tier >= 1 && tier <= 4);
        uint256 cap = rateLimiter.dailyLimit(tier);
        vm.assume(amount <= cap);

        vm.prank(poolCaller);
        rateLimiter.checkAndRecord(alice, amount, tier);
        assertLe(rateLimiter.remaining(alice, tier), cap);
    }
}
