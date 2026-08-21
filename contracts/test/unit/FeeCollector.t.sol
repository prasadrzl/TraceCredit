// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {IFeeCollector} from "../../src/interfaces/IFeeCollector.sol";

contract FeeCollectorTest is DeployHelper {

    address internal poolCaller = makeAddr("poolCaller");
    bytes32 internal LP_ROLE;

    function setUp() public {
        _deploy();
        LP_ROLE = feeCol.LENDING_POOL_ROLE();
        vm.startPrank(admin);
        feeCol.grantRole(LP_ROLE, poolCaller);
        vm.stopPrank();
    }

    // ── distributeFees ────────────────────────────────────────────────────────

    function test_distributeFees_correctSplit() public {
        uint256 total = 100e6;
        usdc.mint(address(feeCol), total);

        uint256 reserveBefore  = usdc.balanceOf(address(reserve));
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 poolBefore     = usdc.balanceOf(address(pool));

        vm.prank(poolCaller);
        feeCol.distributeFees(total);

        // Default split: 15% reserve, 5% DAO, 80% LP (forwarded to the LendingPool,
        // so it accrues to LP token holders — nothing is stranded in the collector).
        assertEq(usdc.balanceOf(address(reserve)) - reserveBefore, 15e6);
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, 5e6);
        assertEq(usdc.balanceOf(address(pool)) - poolBefore, 80e6);
        assertEq(usdc.balanceOf(address(feeCol)), 0);
    }

    function test_distributeFees_zero_noOp() public {
        vm.prank(poolCaller);
        feeCol.distributeFees(0);
    }

    function test_distributeFees_onlyLendingPool() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        feeCol.distributeFees(100e6);
    }

    function test_distributeFees_emitsEvent() public {
        uint256 total = 100e6;
        usdc.mint(address(feeCol), total);

        vm.expectEmit(false, false, false, true);
        emit IFeeCollector.FeesDistributed(15e6, 5e6, 80e6);
        vm.prank(poolCaller);
        feeCol.distributeFees(total);
    }

    // ── setFeeSplit ───────────────────────────────────────────────────────────

    function test_setFeeSplit_success() public {
        vm.prank(admin);
        feeCol.setFeeSplit(2000, 1000, 7000);
        assertEq(feeCol.reserveShareBps(), 2000);
        assertEq(feeCol.daoShareBps(),     1000);
        assertEq(feeCol.lpShareBps(),      7000);
    }

    function test_setFeeSplit_revertsIfNotSumTo10000() public {
        vm.expectRevert(IFeeCollector.SplitMustSumTo10000.selector);
        vm.prank(admin);
        feeCol.setFeeSplit(1000, 1000, 7000);
    }

    function test_setFeeSplit_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        feeCol.setFeeSplit(1500, 500, 8000);
    }

    function test_setFeeSplit_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit IFeeCollector.FeeSplitUpdated(2000, 1000, 7000);
        vm.prank(admin);
        feeCol.setFeeSplit(2000, 1000, 7000);
    }

    // ── Custom split ──────────────────────────────────────────────────────────

    function test_distributeFees_customSplit() public {
        vm.prank(admin);
        feeCol.setFeeSplit(5000, 0, 5000); // 50/0/50

        uint256 total = 200e6;
        usdc.mint(address(feeCol), total);
        uint256 poolBefore = usdc.balanceOf(address(pool));

        vm.prank(poolCaller);
        feeCol.distributeFees(total);

        // 50% reserve, 0% DAO, 50% LP forwarded to the pool.
        assertEq(usdc.balanceOf(address(reserve)), 100e6);
        assertEq(usdc.balanceOf(treasury), 0);
        assertEq(usdc.balanceOf(address(pool)) - poolBefore, 100e6);
        assertEq(usdc.balanceOf(address(feeCol)), 0);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_distributeFees_splitInvariant(uint96 total) public {
        usdc.mint(address(feeCol), total);

        uint256 reserveBefore  = usdc.balanceOf(address(reserve));
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(poolCaller);
        feeCol.distributeFees(total);

        uint256 reserveDelta  = usdc.balanceOf(address(reserve)) - reserveBefore;
        uint256 treasuryDelta = usdc.balanceOf(treasury) - treasuryBefore;
        assertLe(reserveDelta + treasuryDelta, total, "reserve+dao <= total");
    }

    /// @dev reserve + dao + lp must always sum exactly to the distributed total.
    function testFuzz_distributeFees_noLeakage(uint96 total) public {
        vm.assume(total > 0);
        usdc.mint(address(feeCol), total);

        uint256 reserveBefore  = usdc.balanceOf(address(reserve));
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 poolBefore     = usdc.balanceOf(address(pool));

        vm.prank(poolCaller);
        feeCol.distributeFees(total);

        // LP cut is forwarded to the pool; the three cuts must sum to the total
        // and nothing may be stranded in the collector.
        uint256 reserveOut  = usdc.balanceOf(address(reserve)) - reserveBefore;
        uint256 treasuryOut = usdc.balanceOf(treasury)         - treasuryBefore;
        uint256 lpOut       = usdc.balanceOf(address(pool))    - poolBefore;
        assertEq(reserveOut + treasuryOut + lpOut, total, "all fees accounted for");
        assertEq(usdc.balanceOf(address(feeCol)), 0, "nothing stranded in collector");
    }

    /// @dev Any split where components sum to 10 000 bps must be accepted.
    function testFuzz_setFeeSplit_acceptsAnySummingTo10000(uint16 r, uint16 d) public {
        vm.assume(uint256(r) + uint256(d) <= 10_000);
        uint16 lp = uint16(10_000 - r - d);
        vm.prank(admin);
        feeCol.setFeeSplit(r, d, lp);
        assertEq(feeCol.reserveShareBps(), r);
        assertEq(feeCol.daoShareBps(),     d);
        assertEq(feeCol.lpShareBps(),      lp);
    }

    /// @dev Any split that does NOT sum to 10 000 bps must revert.
    function testFuzz_setFeeSplit_revertsIfNotSum10000(uint16 r, uint16 d, uint16 lp) public {
        vm.assume(uint256(r) + uint256(d) + uint256(lp) != 10_000);
        vm.expectRevert(IFeeCollector.SplitMustSumTo10000.selector);
        vm.prank(admin);
        feeCol.setFeeSplit(r, d, lp);
    }
}
