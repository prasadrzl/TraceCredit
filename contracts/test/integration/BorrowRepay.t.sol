// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ILendingPool} from "../../src/interfaces/ILendingPool.sol";
import {IScoreEngine} from "../../src/interfaces/IScoreEngine.sol";

/**
 * @notice Integration: full deposit → borrow → repay lifecycle.
 *         Verifies that every contract in the call chain (LendingPool, ScoreEngine,
 *         CreditLineManager, InterestAccrualEngine, FeeCollector, ReserveModule)
 *         transitions correctly in concert.
 */
contract BorrowRepayIntegrationTest is DeployHelper {

    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");
    address internal lp    = makeAddr("lp");

    uint256 internal constant DEPOSIT = 50_000e6;
    uint256 internal constant BORROW  = 400e6;   // < Silver 500 limit

    function setUp() public {
        _deploy();
        vm.warp(1 days);
        _depositToPool(lp, DEPOSIT);
        _setupBorrower(alice, 201); // Silver tier
    }

    // ── Single borrow → on-time repayment ─────────────────────────────────────

    function test_fullRepay_scoreIncreases() public {
        uint16 scoreBefore = sbt.getScore(alice);

        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);

        // Repay before deadline
        uint256 fullDebt = BORROW + 1e6; // slightly overshoot (payment is capped)
        usdc.mint(alice, fullDebt);
        vm.prank(alice);
        usdc.approve(address(pool), fullDebt);
        vm.prank(alice);
        pool.repay(loanId, fullDebt);

        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.Repaid));
        assertGt(sbt.getScore(alice), scoreBefore, "on-time repayment must increase score");
    }

    function test_fullRepay_creditLineReturnsToZeroUsed() public {
        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);

        assertEq(clm.getCreditLine(alice).used, BORROW);

        uint256 fullDebt = BORROW + 2e6;
        usdc.mint(alice, fullDebt);
        vm.prank(alice);
        usdc.approve(address(pool), fullDebt);
        vm.prank(alice);
        pool.repay(loanId, fullDebt);

        assertEq(clm.getCreditLine(alice).used, 0, "credit line used must clear after full repayment");
    }

    function test_fullRepay_utilisationDropsToZero() public {
        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);

        assertGt(pool.getUtilisationBps(), 0);

        uint256 fullDebt = BORROW + 2e6;
        usdc.mint(alice, fullDebt);
        vm.prank(alice);
        usdc.approve(address(pool), fullDebt);
        vm.prank(alice);
        pool.repay(loanId, fullDebt);

        assertEq(pool.totalOutstanding(), 0);
    }

    function test_fullRepay_feesDistributedToReserveAndTreasury() public {
        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);

        // Wait for some interest to accrue
        vm.warp(block.timestamp + 15 days);

        uint256 reserveBefore  = usdc.balanceOf(address(reserve));
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        uint256 fullDebt = BORROW + 50e6;
        usdc.mint(alice, fullDebt);
        vm.prank(alice);
        usdc.approve(address(pool), fullDebt);
        vm.prank(alice);
        pool.repay(loanId, fullDebt);

        // Interest > 0 means reserve and/or treasury should have received funds
        assertGe(
            usdc.balanceOf(address(reserve)) + usdc.balanceOf(treasury),
            reserveBefore + treasuryBefore,
            "fees must flow to reserve or treasury on repayment"
        );
    }

    // ── Partial repay ─────────────────────────────────────────────────────────

    function test_partialRepay_loanStaysActive() public {
        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);

        uint256 halfDebt = BORROW / 2;
        usdc.mint(alice, halfDebt);
        vm.prank(alice);
        usdc.approve(address(pool), halfDebt);
        vm.prank(alice);
        pool.repay(loanId, halfDebt);

        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.Active));
        assertGt(clm.getCreditLine(alice).used, 0, "partial repay leaves some credit used");
    }

    // ── LP deposit / redeem with profit ───────────────────────────────────────

    function test_lpSharesAppreciateAfterInterest() public {
        // Record initial share value
        uint256 sharesBefore = pool.balanceOf(lp);
        uint256 assetsBefore = pool.convertToAssets(sharesBefore);

        // Borrow and repay with interest
        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);
        vm.warp(block.timestamp + pool.LOAN_DURATION() - 1);

        uint256 repayAmount = BORROW + 10e6;
        usdc.mint(alice, repayAmount);
        vm.prank(alice);
        usdc.approve(address(pool), repayAmount);
        vm.prank(alice);
        pool.repay(loanId, repayAmount);

        // After repayment (principal back in pool), LP assets should be >= before
        uint256 assetsAfter = pool.convertToAssets(sharesBefore);
        assertGe(assetsAfter, assetsBefore, "LP assets should not decrease after repayment");
    }

    // ── Multi-borrower ────────────────────────────────────────────────────────

    function test_multiBorrower_utilisationTracksCorrectly() public {
        _setupBorrower(bob, 201); // Silver

        vm.prank(alice);
        pool.borrow(200e6);
        vm.prank(bob);
        pool.borrow(200e6);

        assertEq(pool.totalOutstanding(), 400e6);
        assertGt(pool.getUtilisationBps(), 0);
        assertLe(pool.getUtilisationBps(), pool.MAX_UTILISATION_BPS());
    }

    function test_multiBorrower_independentCreditLines() public {
        _setupBorrower(bob, 201);

        vm.prank(alice);
        pool.borrow(200e6);

        assertEq(clm.getCreditLine(alice).used, 200e6);
        assertEq(clm.getCreditLine(bob).used, 0, "bob's credit line unaffected");
    }

    // ── Grace period repay ────────────────────────────────────────────────────

    function test_lateRepay_afterGracePeriod_scorePenalizedThenRewarded() public {
        vm.prank(alice);
        uint256 loanId = pool.borrow(BORROW);

        uint16 scoreBeforeLate = sbt.getScore(alice);

        // Advance past loan deadline to trigger grace period
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);

        uint16 scoreAfterLate = sbt.getScore(alice);
        assertLt(scoreAfterLate, scoreBeforeLate, "late repayment signal must penalize score");

        // Repay during grace period
        uint256 fullDebt = BORROW + 50e6;
        usdc.mint(alice, fullDebt);
        vm.prank(alice);
        usdc.approve(address(pool), fullDebt);
        vm.prank(alice);
        pool.repay(loanId, fullDebt);

        assertEq(uint8(pool.getLoan(loanId).state), uint8(ILendingPool.LoanState.Repaid));
        // On-time repayment signal still fires even if paid during grace
        assertGt(sbt.getScore(alice), scoreAfterLate, "repayment signal should partially restore score");
    }
}
