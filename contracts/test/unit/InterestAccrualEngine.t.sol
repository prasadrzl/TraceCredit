// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";

contract InterestAccrualEngineTest is DeployHelper {

    function setUp() public {
        _deploy();
    }

    // ── calcRate: below kink ──────────────────────────────────────────────────

    function test_calcRate_zero() public view {
        uint256 rate = iae.calcRate(0);
        assertEq(rate, iae.BASE_RATE(), "rate at 0 util = base rate");
    }

    function test_calcRate_atKink() public view {
        uint256 kink = iae.KINK();
        uint256 rate = iae.calcRate(kink);
        uint256 expected = iae.BASE_RATE() + (kink * iae.SLOPE_1()) / 1e18;
        assertEq(rate, expected, "rate at kink");
    }

    function test_calcRate_aboveKink() public view {
        uint256 kink     = iae.KINK();
        uint256 util     = kink + 0.1e18; // 80%
        uint256 rate     = iae.calcRate(util);
        uint256 normal   = iae.BASE_RATE() + (kink * iae.SLOPE_1()) / 1e18;
        uint256 expected = normal + (0.1e18 * iae.JUMP_MULTIPLIER()) / 1e18;
        assertEq(rate, expected, "rate above kink");
    }

    function test_calcRate_fullUtilization() public view {
        uint256 rate = iae.calcRate(1e18); // 100%
        assertTrue(rate > iae.calcRate(iae.KINK()), "rate at 100% > rate at kink");
    }

    // ── calcAccrued ───────────────────────────────────────────────────────────

    function test_calcAccrued_zeroBlocks() public view {
        assertEq(iae.calcAccrued(1000e6, 1000, 0), 0);
    }

    function test_calcAccrued_oneYear() public view {
        uint256 principal = 1000e6; // 1000 USDC
        uint256 rateBps   = 1000;   // 10% APR
        uint256 blocks    = iae.BLOCKS_PER_YEAR();
        uint256 interest  = iae.calcAccrued(principal, rateBps, blocks);
        // 1000 USDC * 10% = 100 USDC
        assertEq(interest, 100e6, "10% of 1000 USDC per year");
    }

    function test_calcAccrued_halfYear() public view {
        uint256 principal = 1000e6;
        uint256 rateBps   = 1000;
        uint256 blocks    = iae.BLOCKS_PER_YEAR() / 2;
        uint256 interest  = iae.calcAccrued(principal, rateBps, blocks);
        assertEq(interest, 50e6, "5% of 1000 USDC in half year");
    }

    // ── calcFee ───────────────────────────────────────────────────────────────

    function test_calcFee_15pct() public view {
        (uint256 reserve, uint256 lp) = iae.calcFee(100e6, 1500);
        assertEq(reserve, 15e6);
        assertEq(lp, 85e6);
        assertEq(reserve + lp, 100e6);
    }

    function test_calcFee_zero() public view {
        (uint256 reserve, uint256 lp) = iae.calcFee(0, 1500);
        assertEq(reserve, 0);
        assertEq(lp, 0);
    }

    function test_calcFee_100pct() public view {
        (uint256 reserve, uint256 lp) = iae.calcFee(100e6, 10_000);
        assertEq(reserve, 100e6);
        assertEq(lp, 0);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function test_setRateParams_success() public {
        vm.prank(admin);
        iae.setRateParams(300, 2000, 40000, 0.8e18);
        assertEq(iae.BASE_RATE(), 300);
        assertEq(iae.SLOPE_1(), 2000);
        assertEq(iae.JUMP_MULTIPLIER(), 40000);
        assertEq(iae.KINK(), 0.8e18);
    }

    function test_setRateParams_kinkOver100pct_reverts() public {
        vm.expectRevert("Kink > 100%");
        vm.prank(admin);
        iae.setRateParams(200, 1000, 30000, 1e18 + 1);
    }

    function test_setRateParams_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        iae.setRateParams(200, 1000, 30000, 0.7e18);
    }

    // ── Kink boundary exactness ───────────────────────────────────────────────

    function test_kinkBoundary_continuity() public view {
        uint256 kink = iae.KINK();
        uint256 rateAtKink       = iae.calcRate(kink);
        uint256 rateJustAboveKink = iae.calcRate(kink + 1);
        // Just above kink uses JUMP_MULTIPLIER, so should be >= rateAtKink
        assertGe(rateJustAboveKink, rateAtKink, "rate non-decreasing at kink");
    }

    function test_kinkBoundary_exactEqual() public view {
        // Rate at exact kink should equal the below-kink formula
        uint256 kink = iae.KINK();
        uint256 expected = iae.BASE_RATE() + (kink * iae.SLOPE_1()) / 1e18;
        assertEq(iae.calcRate(kink), expected, "rate exactly at kink");
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_calcRate_monotonic(uint128 a, uint128 b) public view {
        vm.assume(a <= 1e18 && b <= 1e18 && a <= b);
        assertLe(iae.calcRate(a), iae.calcRate(b), "rate is monotonically non-decreasing");
    }

    function testFuzz_calcFee_sumsToInterest(uint128 interest, uint16 rfBps) public view {
        vm.assume(rfBps <= 10_000);
        (uint256 r, uint256 l) = iae.calcFee(interest, rfBps);
        assertEq(r + l, interest, "fee parts sum to interest");
    }

    function testFuzz_calcAccrued_noOverflow(uint64 principal, uint16 rateBps, uint32 blocks) public view {
        vm.assume(rateBps <= 50_000); // sane upper bound
        uint256 interest = iae.calcAccrued(principal, rateBps, blocks);
        assertGe(interest + principal, interest, "no overflow");
    }
}
