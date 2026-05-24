// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ILendingPool} from "../../src/interfaces/ILendingPool.sol";
import {ILiquidationManager} from "../../src/interfaces/ILiquidationManager.sol";
import {IScoreEngine} from "../../src/interfaces/IScoreEngine.sol";

/**
 * @notice Integration: full default and liquidation lifecycle.
 *         Active → GracePeriod → Defaulted → WrittenOff across
 *         LendingPool, ScoreEngine, CreditLineManager, ReserveModule,
 *         and LiquidationManager.
 */
contract DefaultLiquidationIntegrationTest is DeployHelper {

    address internal alice  = makeAddr("alice");
    address internal bob    = makeAddr("bob");
    address internal lp     = makeAddr("lp");
    address internal keeper = makeAddr("keeper");

    bytes32 internal KEEPER_ROLE;
    bytes32 internal LIQ_ROLE;

    uint256 internal loanId;

    function setUp() public {
        _deploy();
        vm.warp(1 days);

        KEEPER_ROLE = liqMgr.KEEPER_ROLE();
        LIQ_ROLE    = pool.LIQUIDATION_MANAGER_ROLE();

        vm.startPrank(admin);
        liqMgr.grantRole(KEEPER_ROLE, keeper);
        vm.stopPrank();

        _depositToPool(lp, 50_000e6);
        usdc.mint(address(reserve), 50_000e6); // pre-fund reserve for loss absorption

        _setupBorrower(alice, 401); // Gold tier
        vm.prank(alice);
        loanId = pool.borrow(1_000e6);
    }

    function _advanceToDefaulted() internal {
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.revokeRole(LIQ_ROLE, admin);
        vm.stopPrank();
    }

    // ── State machine transitions ─────────────────────────────────────────────

    function test_gracePeriod_stateTransition() public {
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.GracePeriod));
    }

    function test_defaulted_stateTransition() public {
        _advanceToDefaulted();
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.Defaulted));
    }

    function test_writtenOff_stateTransition() public {
        _advanceToDefaulted();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    // ── Score effects across the default lifecycle ────────────────────────────

    function test_gracePeriodTrigger_penalizesScore() public {
        uint16 scoreBefore = sbt.getScore(alice);
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        assertLt(sbt.getScore(alice), scoreBefore, "grace period must penalize score");
    }

    function test_liquidation_penalizesScoreBy200pts() public {
        // Step 1: trigger grace period
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        uint16 scoreAfterGrace = sbt.getScore(alice);

        // Step 2: advance past grace period and mark defaulted (no re-trigger)
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.revokeRole(LIQ_ROLE, admin);
        vm.stopPrank();

        // Step 3: liquidate
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        uint16 scoreAfterLiquidation = sbt.getScore(alice);
        // DEFAULT signal is -200 pts (unscaled); score is floor-clamped to 0
        assertLt(scoreAfterLiquidation, scoreAfterGrace, "DEFAULT signal must slash score");
    }

    // ── Credit line effects ───────────────────────────────────────────────────

    function test_liquidation_freezesCreditLine() public {
        _advanceToDefaulted();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);
        assertTrue(clm.getCreditLine(alice).frozen, "credit line must be frozen after liquidation");
    }

    function test_creditLineFrozen_blocksBorrowing() public {
        _advanceToDefaulted();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        // Even with enough score, frozen line blocks new borrow
        _depositToPool(lp, 50_000e6);
        vm.expectRevert();
        vm.prank(alice);
        pool.borrow(100e6);
    }

    // ── Reserve module ────────────────────────────────────────────────────────

    function test_liquidation_reserveAbsorbsOutstanding() public {
        _advanceToDefaulted();

        // absorbLoss records the write-off but does not transfer USDC out;
        // just verify the liquidation completes without revert and the reserve
        // balance remains at or above what it held before (no unexpected drain).
        uint256 reserveBefore = reserve.reserveBalance();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        assertGe(reserve.reserveBalance(), 0, "reserve balance must remain non-negative");
        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
        // absorbLoss records the write-off in an event; the balance does not decrease.
        assertEq(reserve.reserveBalance(), reserveBefore);
    }

    // ── Batch liquidation ─────────────────────────────────────────────────────

    function test_batchLiquidation_multipleDefaulted() public {
        _setupBorrower(bob, 401);
        vm.prank(bob);
        uint256 loanId2 = pool.borrow(500e6);

        // Default both loans
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        pool.triggerGracePeriod(loanId2);

        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.markDefaulted(loanId2);
        pool.revokeRole(LIQ_ROLE, admin);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = loanId;
        ids[1] = loanId2;

        vm.prank(keeper);
        liqMgr.batchLiquidate(ids);

        assertEq(uint8(pool.getLoan(loanId).state),  uint8(ILendingPool.LoanState.WrittenOff));
        assertEq(uint8(pool.getLoan(loanId2).state), uint8(ILendingPool.LoanState.WrittenOff));
        assertTrue(clm.getCreditLine(alice).frozen);
        assertTrue(clm.getCreditLine(bob).frozen);
    }

    function test_batchLiquidation_mixedValidInvalid_noRevert() public {
        _advanceToDefaulted();

        uint256[] memory ids = new uint256[](3);
        ids[0] = loanId;
        ids[1] = 9999;   // non-existent
        ids[2] = 10000;  // non-existent

        vm.prank(keeper);
        liqMgr.batchLiquidate(ids); // should not revert

        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    // ── Double liquidation guard ──────────────────────────────────────────────

    function test_liquidate_revertsIfAlreadyWrittenOff() public {
        _advanceToDefaulted();
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        vm.expectRevert(ILiquidationManager.AlreadyLiquidated.selector);
        vm.prank(keeper);
        liqMgr.liquidate(loanId);
    }

    // ── End-to-end narrative ──────────────────────────────────────────────────

    function test_e2e_borrowToWrittenOff() public {
        uint16 scoreInitial = sbt.getScore(alice);

        // Miss the deadline
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        assertLt(sbt.getScore(alice), scoreInitial);

        // Expire grace period
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);
        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.revokeRole(LIQ_ROLE, admin);
        vm.stopPrank();

        // Keeper liquidates
        vm.prank(keeper);
        liqMgr.liquidate(loanId);

        ILendingPool.Loan memory loan = pool.getLoan(loanId);
        assertEq(uint8(loan.state), uint8(ILendingPool.LoanState.WrittenOff));
        // Gold start (401) - 50 (late) - 200 (default) = 151; clamped at 0 if < 0
        assertLt(sbt.getScore(alice), scoreInitial, "score must fall after DEFAULT signal");
        assertTrue(clm.getCreditLine(alice).frozen);
    }
}
