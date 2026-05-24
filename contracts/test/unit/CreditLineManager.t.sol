// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ICreditLineManager} from "../../src/interfaces/ICreditLineManager.sol";

contract CreditLineManagerTest is DeployHelper {

    address internal alice      = makeAddr("alice");
    address internal poolCaller = makeAddr("poolCaller");

    bytes32 internal LP_ROLE;
    bytes32 internal GUARDIAN;

    function setUp() public {
        _deploy();
        LP_ROLE  = clm.LENDING_POOL_ROLE();
        GUARDIAN = clm.GUARDIAN_ROLE();
        vm.startPrank(admin);
        clm.grantRole(LP_ROLE, poolCaller);
        vm.stopPrank();
    }

    // ── requestIncrease ───────────────────────────────────────────────────────

    function test_requestIncrease_silverTier() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();
        ICreditLineManager.CreditLine memory cl = clm.getCreditLine(alice);
        assertEq(cl.limit, scoreEngine.SILVER_LIMIT());
    }

    function test_requestIncrease_tiersUpgrade() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        // Upgrade to Gold (add 200 → total 401)
        _forceScore(alice, 200);
        vm.warp(block.timestamp + 61 days);
        vm.prank(alice);
        clm.requestIncrease();

        ICreditLineManager.CreditLine memory cl = clm.getCreditLine(alice);
        assertEq(cl.limit, scoreEngine.GOLD_LIMIT());
    }

    function test_requestIncrease_revertsIfFrozen() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.prank(admin);
        clm.freeze(alice);

        vm.warp(block.timestamp + 91 days);
        vm.expectRevert(ICreditLineManager.CreditLineFrozenError.selector);
        vm.prank(alice);
        clm.requestIncrease();
    }

    function test_requestIncrease_revertsIfScoreInsufficient() public {
        _mintSBT(alice);
        vm.warp(block.timestamp + 91 days);
        vm.expectRevert(ICreditLineManager.ScoreInsufficientForIncrease.selector);
        vm.prank(alice);
        clm.requestIncrease();
    }

    function test_requestIncrease_revertsIfLockupNotExpired() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        // Score upgraded to Gold, but immediately try to increase again (within lockup)
        _forceScore(alice, 200);
        vm.expectRevert(ICreditLineManager.LockupNotExpired.selector);
        vm.prank(alice);
        clm.requestIncrease();
    }

    function test_requestIncrease_revertsWhenPaused() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.prank(admin);
        clm.pause();

        vm.warp(block.timestamp + 91 days);
        vm.expectRevert();
        vm.prank(alice);
        clm.requestIncrease();
    }

    // ── debit / credit ────────────────────────────────────────────────────────

    function test_debit_success() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        vm.prank(poolCaller);
        clm.debit(alice, 100e6);
        assertEq(clm.getCreditLine(alice).used, 100e6);
    }

    function test_debit_revertsIfExceedsLimit() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        uint256 overLimit = scoreEngine.SILVER_LIMIT() + 1; // cache before prank
        vm.expectRevert(ICreditLineManager.ExceedsLimit.selector);
        vm.prank(poolCaller);
        clm.debit(alice, overLimit);
    }

    function test_debit_revertsIfFrozen() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();
        vm.prank(admin);
        clm.freeze(alice);

        vm.expectRevert(ICreditLineManager.CreditLineFrozenError.selector);
        vm.prank(poolCaller);
        clm.debit(alice, 100e6);
    }

    function test_debit_onlyLendingPool() public {
        vm.expectRevert();
        vm.prank(alice);
        clm.debit(alice, 100e6);
    }

    function test_credit_success() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        vm.startPrank(poolCaller);
        clm.debit(alice, 100e6);
        clm.credit(alice, 50e6);
        vm.stopPrank();
        assertEq(clm.getCreditLine(alice).used, 50e6);
    }

    function test_credit_usedNeverUnderflows() public {
        vm.prank(poolCaller);
        clm.credit(alice, 999e6); // credit more than used (0)
        assertEq(clm.getCreditLine(alice).used, 0);
    }

    function test_credit_onlyLendingPool() public {
        vm.expectRevert();
        vm.prank(alice);
        clm.credit(alice, 100e6);
    }

    // ── freeze / unfreeze ─────────────────────────────────────────────────────

    function test_freeze_onlyGuardian() public {
        vm.expectRevert();
        vm.prank(alice);
        clm.freeze(alice);
    }

    function test_unfreeze_success() public {
        vm.startPrank(admin);
        clm.freeze(alice);
        clm.unfreeze(alice);
        vm.stopPrank();
        assertFalse(clm.getCreditLine(alice).frozen);
    }

    function test_unfreeze_onlyGuardian() public {
        vm.expectRevert();
        vm.prank(alice);
        clm.unfreeze(alice);
    }

    // ── available ─────────────────────────────────────────────────────────────

    function test_available_equals_limitMinusUsed() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        vm.prank(poolCaller);
        clm.debit(alice, 100e6);
        assertEq(clm.available(alice), scoreEngine.SILVER_LIMIT() - 100e6);
    }

    function test_available_zeroForFreshWallet() public view {
        assertEq(clm.available(alice), 0);
    }

    // ── setScoreEngine ────────────────────────────────────────────────────────

    function test_setScoreEngine_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(alice);
        clm.setScoreEngine(address(scoreEngine));
    }

    function test_setScoreEngine_rejectsZero() public {
        vm.expectRevert();
        vm.prank(admin);
        clm.setScoreEngine(address(0));
    }

    function test_setScoreEngine_success() public {
        vm.prank(admin);
        clm.setScoreEngine(address(scoreEngine));
        assertEq(clm.scoreEngine(), address(scoreEngine));
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    /// @dev After any valid debit, used must never exceed the credit limit.
    function testFuzz_debit_usedNeverExceedsLimit(uint256 amount) public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        uint256 limit = clm.getCreditLine(alice).limit;
        vm.assume(amount > 0 && amount <= limit);

        vm.prank(poolCaller);
        clm.debit(alice, amount);

        assertLe(clm.getCreditLine(alice).used, limit);
    }

    /// @dev credit() must never cause used to underflow below zero.
    function testFuzz_credit_usedNeverUnderflows(uint256 creditAmt) public {
        vm.assume(creditAmt > 0 && creditAmt < type(uint128).max);
        // credit with no prior debit — used is 0, so clamp kicks in
        vm.prank(poolCaller);
        clm.credit(alice, creditAmt);
        assertEq(clm.getCreditLine(alice).used, 0);
    }

    /// @dev available() == limit - used always holds after arbitrary debit.
    function testFuzz_available_alwaysLimitMinusUsed(uint256 amount) public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        uint256 limit = clm.getCreditLine(alice).limit;
        vm.assume(amount > 0 && amount <= limit);

        vm.prank(poolCaller);
        clm.debit(alice, amount);

        assertEq(clm.available(alice), limit - amount);
    }

    // ── Events ────────────────────────────────────────────────────────────────

    function test_requestIncrease_emitsEvent() public {
        _mintSBT(alice);
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);

        vm.expectEmit(true, false, false, false);
        emit ICreditLineManager.CreditLineIncreased(alice, 0, scoreEngine.SILVER_LIMIT());
        vm.prank(alice);
        clm.requestIncrease();
    }
}
