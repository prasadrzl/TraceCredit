// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";

contract EmergencyPauseTest is DeployHelper {

    function setUp() public {
        _deploy();
    }

    // ── pauseAll ──────────────────────────────────────────────────────────────

    function test_pauseAll_pausesAllRegisteredContracts() public {
        vm.prank(admin);
        epause.pauseAll();
        assertTrue(pool.paused());
        assertTrue(scoreEngine.paused());
    }

    function test_pauseAll_onlyPauser() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        epause.pauseAll();
    }

    // ── queueUnpause ──────────────────────────────────────────────────────────

    function test_queueUnpause_success() public {
        vm.prank(admin);
        epause.pauseAll();

        vm.prank(admin);
        epause.queueUnpause();
        assertGt(epause.unpauseQueuedAt(), 0);
    }

    function test_queueUnpause_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        epause.queueUnpause();
    }

    // ── unpauseAll ────────────────────────────────────────────────────────────

    function test_unpauseAll_afterTimelock() public {
        vm.prank(admin);
        epause.pauseAll();
        vm.prank(admin);
        epause.queueUnpause();

        vm.warp(block.timestamp + epause.UNPAUSE_TIMELOCK() + 1);
        vm.prank(admin);
        epause.unpauseAll();

        assertFalse(pool.paused());
        assertFalse(scoreEngine.paused());
    }

    function test_unpauseAll_revertsIfTimelockNotExpired() public {
        vm.prank(admin);
        epause.pauseAll();
        vm.prank(admin);
        epause.queueUnpause();

        vm.expectRevert();
        vm.prank(admin);
        epause.unpauseAll();
    }

    function test_unpauseAll_revertsIfNotQueued() public {
        vm.expectRevert();
        vm.prank(admin);
        epause.unpauseAll();
    }

    // ── addPausable / removePausable ──────────────────────────────────────────

    function test_addPausable_success() public {
        address newContract = makeAddr("new");
        vm.prank(admin);
        epause.addPausable(newContract);
        assertEq(epause.pausableContracts(2), newContract);
    }

    function test_addPausable_zeroAddress() public {
        vm.expectRevert();
        vm.prank(admin);
        epause.addPausable(address(0));
    }

    function test_removePausable_success() public {
        vm.prank(admin);
        epause.removePausable(0); // remove first (pool)
    }

    function test_removePausable_outOfBounds() public {
        vm.expectRevert("Out of bounds");
        vm.prank(admin);
        epause.removePausable(99);
    }

    function test_addPausable_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        epause.addPausable(makeAddr("x"));
    }
}
