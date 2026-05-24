// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ILendingPool} from "../../src/interfaces/ILendingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LendingPoolTest is DeployHelper {

    address internal alice = makeAddr("alice");
    address internal lp    = makeAddr("lp");

    bytes32 internal LIQ_ROLE;

    function setUp() public {
        _deploy();
        vm.warp(1 days);
        LIQ_ROLE = pool.LIQUIDATION_MANAGER_ROLE();
    }

    // ── Deposit / ERC-4626 ────────────────────────────────────────────────────

    function test_deposit_success() public {
        _depositToPool(lp, 1000e6);
        assertGt(pool.balanceOf(lp), 0, "LP tokens minted");
        assertEq(pool.totalAssets(), 1000e6);
    }

    function test_deposit_multipleProviders() public {
        address lp2 = makeAddr("lp2");
        _depositToPool(lp, 500e6);
        _depositToPool(lp2, 500e6);
        assertEq(pool.totalAssets(), 1000e6);
    }

    // ── Borrow ────────────────────────────────────────────────────────────────

    function test_borrow_success() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        assertGt(id, 0);
        assertEq(usdc.balanceOf(alice) - aliceBefore, 100e6);
        assertEq(pool._totalOutstanding(), 100e6);
    }

    function test_borrow_revertsIfExceedsCreditLimit() public {
        _depositToPool(lp, 1_000_000e6);
        _setupBorrower(alice, 201); // Silver = 500 USDC limit

        uint256 overLimit = scoreEngine.SILVER_LIMIT() + 1;
        vm.expectRevert(ILendingPool.ExceedsCreditLimit.selector);
        vm.prank(alice);
        pool.borrow(overLimit);
    }

    function test_borrow_revertsIfNoSBT() public {
        _depositToPool(lp, 1000e6);
        vm.expectRevert(ILendingPool.NoSBTOrFrozen.selector);
        vm.prank(alice);
        pool.borrow(100e6);
    }

    function test_borrow_revertsIfFrozenSBT() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(admin);
        sbt.freezeSBT(alice);

        vm.expectRevert(ILendingPool.NoSBTOrFrozen.selector);
        vm.prank(alice);
        pool.borrow(100e6);
    }

    function test_borrow_revertsIfPaused() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(admin);
        pool.pause();

        vm.expectRevert();
        vm.prank(alice);
        pool.borrow(100e6);
    }

    function test_borrow_revertsIfUtilisationTooHigh() public {
        _depositToPool(lp, 100e6);
        _setupBorrower(alice, 801);

        vm.expectRevert(ILendingPool.PoolUtilisationTooHigh.selector);
        vm.prank(alice);
        pool.borrow(100e6); // = 100% utilisation, exceeds 90%
    }

    function test_borrow_revertsIfNotAllowedByWhitelist() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        // Enable whitelist
        vm.prank(admin);
        pool.setWhitelistRegistry(address(whitelist));

        // Queue the block (first call — commits without revert)
        vm.prank(admin);
        whitelist.blockAddress(alice);
        assertFalse(whitelist.blocked(alice), "not blocked yet");

        // Warp past delay, execute the block
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.blockAddress(alice);
        assertTrue(whitelist.blocked(alice), "now blocked");

        vm.expectRevert(ILendingPool.NotAllowed.selector);
        vm.prank(alice);
        pool.borrow(100e6);
    }

    // ── Repay ─────────────────────────────────────────────────────────────────

    function test_repay_fullRepayment() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        usdc.mint(alice, 100e6); // extra for interest
        vm.startPrank(alice);
        usdc.approve(address(pool), 200e6);
        pool.repay(id, 200e6); // over-pay — capped to outstanding
        vm.stopPrank();

        assertEq(uint8(pool.getLoan(id).state), uint8(ILendingPool.LoanState.Repaid));
    }

    function test_repay_partial() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        usdc.mint(alice, 50e6);
        vm.startPrank(alice);
        usdc.approve(address(pool), 50e6);
        pool.repay(id, 50e6);
        vm.stopPrank();

        assertEq(uint8(pool.getLoan(id).state), uint8(ILendingPool.LoanState.Active));
        assertEq(pool.getLoan(id).repaid, 50e6);
    }

    function test_repay_revertsForTerminalLoan() public {
        // Create and fully repay a loan to get it to Repaid state
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        usdc.mint(alice, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(pool), 200e6);
        pool.repay(id, 200e6);
        vm.stopPrank();

        // Now try to repay again — loan is in Repaid state
        vm.expectRevert(ILendingPool.LoanNotActive.selector);
        vm.prank(alice);
        pool.repay(id, 1);
    }

    function test_repay_enterGracePeriodLazily() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);

        usdc.mint(alice, 200e6);
        vm.startPrank(alice);
        usdc.approve(address(pool), 200e6);
        pool.repay(id, 200e6);
        vm.stopPrank();
    }

    // ── triggerGracePeriod ────────────────────────────────────────────────────

    function test_triggerGracePeriod_success() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(id);

        assertEq(uint8(pool.getLoan(id).state), uint8(ILendingPool.LoanState.GracePeriod));
    }

    function test_triggerGracePeriod_revertsForRepaidLoan() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        // Fully repay it
        usdc.mint(alice, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(pool), 200e6);
        pool.repay(id, 200e6);
        vm.stopPrank();

        // Now trigger grace period on a Repaid loan
        vm.expectRevert(ILendingPool.LoanNotActive.selector);
        pool.triggerGracePeriod(id);
    }

    function test_triggerGracePeriod_revertsBeforeDeadline() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        vm.expectRevert(ILendingPool.DeadlineNotPassed.selector);
        pool.triggerGracePeriod(id);
    }

    // ── markDefaulted / markWrittenOff ────────────────────────────────────────

    function test_markDefaulted_success() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(id);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);

        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(id);
        vm.stopPrank();

        assertEq(uint8(pool.getLoan(id).state), uint8(ILendingPool.LoanState.Defaulted));
    }

    function test_markDefaulted_revertsIfNotGracePeriod() public {
        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        vm.expectRevert(ILendingPool.InvalidLoanState.selector);
        pool.markDefaulted(999); // non-existent loan — but zero-init state is Active, not GracePeriod
        vm.stopPrank();
    }

    function test_markWrittenOff_success() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        uint256 id = pool.borrow(100e6);

        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(id);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);

        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(id);
        pool.markWrittenOff(id);
        vm.stopPrank();

        assertEq(uint8(pool.getLoan(id).state), uint8(ILendingPool.LoanState.WrittenOff));
    }

    function test_markDefaulted_onlyLiquidationManager() public {
        vm.expectRevert();
        vm.prank(alice);
        pool.markDefaulted(1);
    }

    // ── totalAssets and utilisation ───────────────────────────────────────────

    function test_totalAssets_includesOutstanding() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        pool.borrow(100e6);

        assertEq(pool.totalAssets(), 10_000e6, "totalAssets includes outstanding");
    }

    function test_getUtilisationBps() public {
        _depositToPool(lp, 1000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        pool.borrow(100e6);

        assertEq(pool.getUtilisationBps(), 1000, "10% utilisation = 1000 bps");
    }

    function test_totalOutstanding_view() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);
        vm.prank(alice);
        pool.borrow(100e6);

        assertEq(pool.totalOutstanding(), 100e6);
    }

    // ── Module setters ────────────────────────────────────────────────────────

    function test_setters_rejectZeroAddress() public {
        vm.expectRevert();
        vm.prank(admin);
        pool.setSbtContract(address(0));
    }

    function test_setters_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(alice);
        pool.setSbtContract(address(sbt));
    }

    function test_rateLimiter_wired() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        // Enable rate limiter
        bytes32 rlLpRole = rateLimiter.LENDING_POOL_ROLE();
        vm.startPrank(admin);
        pool.setRateLimiter(address(rateLimiter));
        rateLimiter.grantRole(rlLpRole, address(pool));
        vm.stopPrank();

        vm.prank(alice);
        pool.borrow(100e6); // should pass rate limiter (within Gold daily limit)
    }

    // ── getLoan ───────────────────────────────────────────────────────────────

    function test_getLoan_returnsCorrectData() public {
        _depositToPool(lp, 10_000e6);
        _setupBorrower(alice, 401);

        vm.prank(alice);
        uint256 id = pool.borrow(200e6);

        ILendingPool.Loan memory loan = pool.getLoan(id);
        assertEq(loan.borrower, alice);
        assertEq(loan.principal, 200e6);
        assertEq(uint8(loan.state), uint8(ILendingPool.LoanState.Active));
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_borrow_utilisationNeverExceeds90pct(uint64 depositAmt, uint64 borrowAmt) public {
        vm.assume(depositAmt > 1_000e6 && depositAmt < 10_000_000e6);
        vm.assume(borrowAmt > 0);

        _depositToPool(lp, depositAmt);
        _setupBorrower(alice, 801); // Diamond = 100k limit

        uint256 maxBorrow90 = (uint256(depositAmt) * pool.MAX_UTILISATION_BPS()) / 10_000;
        uint256 creditLimit = scoreEngine.DIAMOND_LIMIT();
        uint256 maxBorrow   = maxBorrow90 < creditLimit ? maxBorrow90 : creditLimit;
        vm.assume(borrowAmt > 0 && borrowAmt <= maxBorrow); // within utilisation cap AND credit limit

        vm.prank(alice);
        pool.borrow(borrowAmt);

        assertLe(pool.getUtilisationBps(), pool.MAX_UTILISATION_BPS());
    }
}

// ── Invariant: utilisation never exceeds 90% ─────────────────────────────────

contract LendingPoolInvariantTest is DeployHelper {

    address internal alice = makeAddr("alice");
    address internal lp    = makeAddr("lp");

    function setUp() public {
        _deploy();
        vm.warp(1 days);
        _depositToPool(lp, 100_000e6);
        _setupBorrower(alice, 801); // Diamond
    }

    function invariant_utilisationBelowMax() public view {
        assertLe(pool.getUtilisationBps(), pool.MAX_UTILISATION_BPS(),
            "utilisation never > 90%");
    }

    function invariant_totalOutstandingLEtotalAssets() public view {
        assertLe(pool._totalOutstanding(), pool.totalAssets(),
            "outstanding never > total assets");
    }
}
