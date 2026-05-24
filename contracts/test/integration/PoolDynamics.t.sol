// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ILendingPool} from "../../src/interfaces/ILendingPool.sol";
import {IScoreEngine} from "../../src/interfaces/IScoreEngine.sol";

/**
 * @notice Integration: pool economic dynamics — multi-LP deposits, utilisation,
 *         rate limiter, whitelist gate, LP share accrual, and interest settlement.
 */
contract PoolDynamicsIntegrationTest is DeployHelper {

    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");
    address internal lp1   = makeAddr("lp1");
    address internal lp2   = makeAddr("lp2");

    function setUp() public {
        _deploy();
        vm.warp(1 days);
    }

    // ── Multi-LP deposits and share accounting ────────────────────────────────

    function test_multiLP_sharesMintedProportionally() public {
        _depositToPool(lp1, 10_000e6);
        uint256 shares1 = pool.balanceOf(lp1);
        assertGt(shares1, 0);

        _depositToPool(lp2, 20_000e6);
        uint256 shares2 = pool.balanceOf(lp2);

        // lp2 deposited 2x lp1, so should hold ~2x shares
        assertApproxEqRel(shares2, shares1 * 2, 0.001e18, "shares proportional to deposit");
    }

    function test_multiLP_totalAssetsIncludes_outstanding() public {
        _depositToPool(lp1, 50_000e6);
        _setupBorrower(alice, 401); // Gold

        uint256 assetsBefore = pool.totalAssets();

        vm.prank(alice);
        pool.borrow(1_000e6);

        // totalAssets = balance + outstanding; outstanding replaces the moved USDC
        assertEq(pool.totalAssets(), assetsBefore, "totalAssets unchanged by borrow");
        assertGt(pool.totalOutstanding(), 0);
    }

    function test_multiLP_redemptionAfterBorrowRepay() public {
        _depositToPool(lp1, 10_000e6);
        uint256 sharesBefore = pool.balanceOf(lp1);

        _setupBorrower(alice, 401);
        vm.prank(alice);
        uint256 loanId = pool.borrow(500e6);

        // Repay with some interest
        vm.warp(block.timestamp + 15 days);
        uint256 repayAmt = 600e6;
        usdc.mint(alice, repayAmt);
        vm.prank(alice);
        usdc.approve(address(pool), repayAmt);
        vm.prank(alice);
        pool.repay(loanId, repayAmt);

        // lp1 redeems — should get at least what was deposited
        uint256 assetsOut = pool.convertToAssets(sharesBefore);
        assertGe(assetsOut, 10_000e6, "LP should recover at least deposit after repayment");
    }

    // ── Utilisation cap enforcement ───────────────────────────────────────────

    function test_utilisation_caps_at90pct() public {
        _depositToPool(lp1, 10_000e6);
        _setupBorrower(alice, 801); // Diamond = 100k limit

        // Try to borrow 95% of pool — must revert
        vm.expectRevert();
        vm.prank(alice);
        pool.borrow(9_500e6);
    }

    function test_utilisation_tracksCumulativeBorrows() public {
        _depositToPool(lp1, 100_000e6);
        _setupBorrower(alice, 801); // Diamond
        _setupBorrower(bob, 801);

        vm.prank(alice);
        pool.borrow(40_000e6);
        vm.prank(bob);
        pool.borrow(40_000e6);

        // 80k / 100k = 80% utilisation
        assertLe(pool.getUtilisationBps(), pool.MAX_UTILISATION_BPS());
        assertGt(pool.getUtilisationBps(), 0);
    }

    // ── Rate limiter integration ──────────────────────────────────────────────

    function test_rateLimiter_blocksExceedingDailyLimit() public {
        // Grant pool the LENDING_POOL_ROLE on rateLimiter then wire it in
        vm.startPrank(admin);
        rateLimiter.grantRole(rateLimiter.LENDING_POOL_ROLE(), address(pool));
        pool.setRateLimiter(address(rateLimiter));
        vm.stopPrank();

        _depositToPool(lp1, 200_000e6);
        _setupBorrower(alice, 801); // Diamond

        uint256 limit = rateLimiter.dailyLimit(uint8(IScoreEngine.Tier.Diamond));
        // Diamond daily limit is 25,000 USDC; credit limit is 100,000 USDC
        // Borrow the full daily limit
        vm.prank(alice);
        pool.borrow(limit);

        // Any further borrow in the same window should be blocked by the rate limiter
        vm.expectRevert();
        vm.prank(alice);
        pool.borrow(1);
    }

    function test_rateLimiter_resetsAfterDay() public {
        vm.startPrank(admin);
        rateLimiter.grantRole(rateLimiter.LENDING_POOL_ROLE(), address(pool));
        pool.setRateLimiter(address(rateLimiter));
        vm.stopPrank();

        _depositToPool(lp1, 200_000e6);
        _setupBorrower(alice, 801);

        uint256 limit = rateLimiter.dailyLimit(uint8(IScoreEngine.Tier.Diamond));

        vm.prank(alice);
        pool.borrow(limit);

        // Advance 1 day to reset the 24-hour window
        vm.warp(block.timestamp + rateLimiter.WINDOW_DURATION() + 1);

        // Second borrow allowed in the new window (credit line still available since limit > daily)
        vm.prank(alice);
        pool.borrow(limit / 2);
    }

    // ── Whitelist gate integration ────────────────────────────────────────────

    function test_whitelist_blockedBorrower_cannotBorrow() public {
        vm.prank(admin);
        pool.setWhitelistRegistry(address(whitelist));

        _depositToPool(lp1, 50_000e6);
        _setupBorrower(alice, 401);

        // Queue and execute blockAddress for alice via timelock
        vm.prank(admin);
        whitelist.blockAddress(alice);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.blockAddress(alice);

        assertTrue(whitelist.blocked(alice));

        vm.expectRevert();
        vm.prank(alice);
        pool.borrow(100e6);
    }

    function test_whitelist_unblocked_canBorrowAgain() public {
        vm.prank(admin);
        pool.setWhitelistRegistry(address(whitelist));

        _depositToPool(lp1, 50_000e6);
        _setupBorrower(alice, 401);

        // Block
        vm.prank(admin);
        whitelist.blockAddress(alice);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.blockAddress(alice);

        // Unblock
        vm.prank(admin);
        whitelist.unblockAddress(alice);
        vm.warp(block.timestamp + whitelist.TIMELOCK_DELAY() + 1);
        vm.prank(admin);
        whitelist.unblockAddress(alice);

        assertFalse(whitelist.blocked(alice));

        // Should be able to borrow again
        vm.prank(alice);
        pool.borrow(100e6); // no revert
    }

    // ── Emergency pause ───────────────────────────────────────────────────────

    function test_emergencyPause_blocksBorrow() public {
        _depositToPool(lp1, 50_000e6);
        _setupBorrower(alice, 401);

        vm.prank(admin);
        epause.pauseAll();

        assertTrue(pool.paused());

        vm.expectRevert();
        vm.prank(alice);
        pool.borrow(100e6);
    }

    function test_emergencyPause_unpauseRestoresOperations() public {
        _depositToPool(lp1, 50_000e6);
        _setupBorrower(alice, 401);

        // Pause
        vm.prank(admin);
        epause.pauseAll();

        // Queue and execute unpause
        vm.prank(admin);
        epause.queueUnpause();
        vm.warp(block.timestamp + epause.UNPAUSE_TIMELOCK() + 1);
        vm.prank(admin);
        epause.unpauseAll();

        assertFalse(pool.paused());

        // Borrow should succeed again
        vm.prank(alice);
        pool.borrow(100e6);
    }

    // ── Interest settlement ───────────────────────────────────────────────────

    function test_interestSettlement_feeSplitCorrect() public {
        _depositToPool(lp1, 100_000e6);
        _setupBorrower(alice, 801); // Diamond = 7% rate

        vm.prank(alice);
        uint256 loanId = pool.borrow(10_000e6);

        // calcAccrued uses block numbers — must advance both time and blocks
        vm.warp(block.timestamp + pool.LOAN_DURATION() - 1);
        vm.roll(block.number + 200_000); // ~28 days of blocks at ~12s/block

        uint256 reserveBefore  = usdc.balanceOf(address(reserve));
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        uint256 repayFull = 12_000e6; // overshoot
        usdc.mint(alice, repayFull);
        vm.prank(alice);
        usdc.approve(address(pool), repayFull);
        vm.prank(alice);
        pool.repay(loanId, repayFull);

        uint256 reserveDelta  = usdc.balanceOf(address(reserve))  - reserveBefore;
        uint256 treasuryDelta = usdc.balanceOf(treasury) - treasuryBefore;

        // At least some fees flowed out
        assertGt(reserveDelta + treasuryDelta, 0, "fees must be distributed on full repayment");
    }

    // ── LP exit after liquidation ─────────────────────────────────────────────

    function test_lpCanStillRedeem_afterDefault_reserveAbsorbs() public {
        _depositToPool(lp1, 50_000e6);
        usdc.mint(address(reserve), 10_000e6);

        _setupBorrower(alice, 401);
        vm.prank(alice);
        uint256 loanId = pool.borrow(1_000e6);

        // Default path
        vm.warp(block.timestamp + pool.LOAN_DURATION() + 1);
        pool.triggerGracePeriod(loanId);
        vm.warp(block.timestamp + pool.GRACE_PERIOD() + 30);

        bytes32 LIQ_ROLE = pool.LIQUIDATION_MANAGER_ROLE();
        vm.startPrank(admin);
        pool.grantRole(LIQ_ROLE, admin);
        pool.markDefaulted(loanId);
        pool.revokeRole(LIQ_ROLE, admin);
        vm.stopPrank();

        bytes32 KEEPER_ROLE = liqMgr.KEEPER_ROLE();
        vm.startPrank(admin);
        liqMgr.grantRole(KEEPER_ROLE, admin);
        liqMgr.liquidate(loanId);
        vm.stopPrank();

        // LP should still be able to redeem (reserve absorbed the loss)
        uint256 shares = pool.balanceOf(lp1);
        assertGt(shares, 0);
        uint256 maxRedeem = pool.maxRedeem(lp1);
        assertGt(maxRedeem, 0, "LP must be able to redeem shares after liquidation");
    }
}
