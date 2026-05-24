// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ILendingPool} from "../../src/interfaces/ILendingPool.sol";
import {ILiquidationManager} from "../../src/interfaces/ILiquidationManager.sol";

contract LiquidationManagerTest is DeployHelper {

    address internal alice  = makeAddr("alice");
    address internal lp     = makeAddr("lp");
    address internal keeper = makeAddr("keeper");

    bytes32 internal KEEPER_ROLE;
    bytes32 internal LIQ_MGR_ROLE;

    uint256 internal loanId;

    function setUp() public {
        _deploy();
        vm.warp(1 days);

        KEEPER_ROLE  = liqMgr.KEEPER_ROLE();
        LIQ_MGR_ROLE = pool.LIQUIDATION_MANAGER_ROLE();

        vm.startPrank(admin);
        liqMgr.grantRole(KEEPER_ROLE, keeper);
        vm.stopPrank();

        // Fund pool and create a borrow
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        loanId = pool.borrow(100e6);
    }

    function _getToDefaultedState() internal {
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_MGR_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.revokeRole(LIQ_MGR_ROLE, admin);
        vm.stopPrank();
        usdc.mint(address(reserve), 100_000e6);
    }

    // ── liquidate ─────────────────────────────────────────────────────────────

    function test_liquidate_success() public {
        _getToDefaultedState();
        uint16 scoreBefore = sbt.getScore(alice);

        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        assertLe(sbt.getScore(alice), scoreBefore);
        assertTrue(clm.getCreditLine(alice).frozen);
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    function test_liquidate_revertsIfNotDefaulted() public {
        vm.expectRevert(ILiquidationManager.LoanNotDefaulted.selector);
        vm.prank(keeper);
        liqMgr.liquidate(loanId);
    }

    function test_liquidate_revertsIfAlreadyLiquidated() public {
        _getToDefaultedState();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        vm.expectRevert(ILiquidationManager.AlreadyLiquidated.selector);
        vm.prank(keeper);
        liqMgr.liquidate(loanId);
    }

    function test_liquidate_unauthorizedReverts() public {
        _getToDefaultedState();
        vm.expectRevert();
        vm.prank(alice);
        liqMgr.liquidate(loanId);
    }

    function test_liquidate_botRoleWorks() public {
        _getToDefaultedState();

        address bot = makeAddr("bot");
        bytes32 botRole = liqMgr.LIQUIDATION_BOT_ROLE();
        vm.startPrank(admin);
        liqMgr.grantRole(botRole, bot);
        vm.stopPrank();

        vm.prank(bot);
        liqMgr.liquidate(loanId);
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    // ── batchLiquidate ────────────────────────────────────────────────────────

    function test_batchLiquidate_success() public {
        address bob = makeAddr("bob");
        _depositToPool(lp, 10_000e6);
        _setupBorrower(bob, 401);
        vm.prank(bob);
        uint256 loanId2 = pool.borrow(100e6);
        usdc.mint(address(reserve), 100_000e6);

        // Default both loans
        _getToDefaultedState();

        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId2);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_MGR_ROLE, admin);
        pool.markDefaulted(loanId2);
        pool.revokeRole(LIQ_MGR_ROLE, admin);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = loanId;
        ids[1] = loanId2;

        vm.prank(keeper);
        liqMgr.batchLiquidate(ids);

        assertEq(uint8(pool.getLoan(loanId).state),  uint8(ILendingPool.LoanState.WrittenOff));
        assertEq(uint8(pool.getLoan(loanId2).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    function test_batchLiquidate_silentlySkipsFailed() public {
        _getToDefaultedState();

        uint256[] memory ids = new uint256[](2);
        ids[0] = loanId;
        ids[1] = 999; // doesn't exist — skipped silently

        vm.prank(keeper);
        liqMgr.batchLiquidate(ids);
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    function test_batchLiquidate_unauthorized() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = loanId;
        vm.expectRevert();
        vm.prank(alice);
        liqMgr.batchLiquidate(ids);
    }

    // ── liquidateInternal access ──────────────────────────────────────────────

    function test_liquidateInternal_onlySelf() public {
        vm.expectRevert();
        vm.prank(keeper);
        liqMgr.liquidateInternal(loanId);
    }

    // ── End-to-end liquidation flow ───────────────────────────────────────────

    function test_e2e_borrowGracePeriodLiquidate() public {
        usdc.mint(address(reserve), 100_000e6);
        uint16 scoreBefore = sbt.getScore(alice);

        // 1. Advance past loan deadline
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.GracePeriod));

        // 2. Advance past grace period + mark defaulted
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_MGR_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.revokeRole(LIQ_MGR_ROLE, admin);
        vm.stopPrank();
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.Defaulted));

        // 3. Keeper liquidates
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
        assertLe(sbt.getScore(alice), scoreBefore);
        assertTrue(clm.getCreditLine(alice).frozen);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    /// @dev batchLiquidate with an all-invalid ID list must never revert.
    function testFuzz_batchLiquidate_nonExistentIdsNeverRevert(uint256[4] calldata ids) public {
        uint256[] memory arr = new uint256[](4);
        for (uint256 i; i < 4; i++) {
            // offset IDs far beyond loanId to guarantee they don't exist
            arr[i] = uint256(ids[i]) % type(uint128).max + 10_000;
        }
        vm.prank(keeper);
        liqMgr.batchLiquidate(arr); // should silently skip all
    }

    /// @dev After liquidation, the borrower's score must be <= the score before.
    function testFuzz_liquidate_scoreNeverIncreasesOnDefault(uint16 initialScore) public {
        vm.assume(initialScore >= 401 && initialScore <= 1000);

        address bob = makeAddr("fuzzBob");
        _depositToPool(lp, 10_000e6);
        _setupBorrower(bob, initialScore);

        vm.prank(bob);
        uint256 lid = pool.borrow(100e6);

        uint16 scoreBefore = sbt.getScore(bob);

        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(lid);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_MGR_ROLE, admin);
        pool.markDefaulted(lid);
        pool.revokeRole(LIQ_MGR_ROLE, admin);
        vm.stopPrank();

        usdc.mint(address(reserve), 100_000e6);
        vm.prank(keeper);
        liqMgr.liquidate(lid);

        assertLe(sbt.getScore(bob), scoreBefore);
    }

    // ── Pause ─────────────────────────────────────────────────────────────────

    function test_liquidate_revertsWhenPaused() public {
        _getToDefaultedState();
        vm.prank(admin);
        liqMgr.pause();

        vm.expectRevert();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);
    }
}
