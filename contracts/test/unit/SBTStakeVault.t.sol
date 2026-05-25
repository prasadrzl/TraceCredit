// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {ISBTStakeVault} from "../../src/interfaces/ISBTStakeVault.sol";

contract SBTStakeVaultTest is DeployHelper {

    address internal alice    = makeAddr("alice");
    address internal guardian = makeAddr("guardian");

    bytes32 internal SBT_ROLE;
    bytes32 internal GUARDIAN_ROLE;

    function setUp() public {
        _deploy();
        SBT_ROLE     = stakeVault.SBT_CONTRACT_ROLE();
        GUARDIAN_ROLE = stakeVault.GUARDIAN_ROLE();
        vm.startPrank(admin);
        stakeVault.grantRole(GUARDIAN_ROLE, guardian);
        vm.stopPrank();
    }

    // ── deposit ───────────────────────────────────────────────────────────────

    function test_deposit_success() public {
        uint256 amount = stakeVault.stakeAmount();
        usdc.mint(alice, amount);

        vm.startPrank(admin);
        stakeVault.grantRole(SBT_ROLE, admin);
        vm.stopPrank();

        vm.prank(alice);
        usdc.approve(address(stakeVault), amount);
        vm.prank(admin);
        stakeVault.deposit(alice);

        ISBTStakeVault.StakeRecord memory rec = stakeVault.stakes(alice);
        assertEq(rec.amount, amount);
        assertGt(rec.depositedAt, 0);
    }

    function test_deposit_onlySBTContract() public {
        vm.expectRevert();
        vm.prank(alice);
        stakeVault.deposit(alice);
    }

    // ── release ───────────────────────────────────────────────────────────────

    function test_release_afterUnlockDelay() public {
        _mintSBT(alice);
        vm.warp(block.timestamp + stakeVault.UNLOCK_DELAY() + 1);

        uint256 balBefore = usdc.balanceOf(alice);

        vm.startPrank(admin);
        stakeVault.grantRole(SBT_ROLE, admin);
        stakeVault.release(alice);
        vm.stopPrank();

        assertGt(usdc.balanceOf(alice), balBefore, "USDC returned");
    }

    function test_release_revertsIfStillLocked() public {
        _mintSBT(alice);

        vm.startPrank(admin);
        stakeVault.grantRole(SBT_ROLE, admin);
        vm.expectRevert();
        stakeVault.release(alice);
        vm.stopPrank();
    }

    function test_release_revertsIfNoStake() public {
        vm.startPrank(admin);
        stakeVault.grantRole(SBT_ROLE, admin);
        vm.expectRevert(ISBTStakeVault.NoStakeFound.selector);
        stakeVault.release(alice);
        vm.stopPrank();
    }

    function test_release_onlySBTContract() public {
        _mintSBT(alice);
        vm.warp(block.timestamp + stakeVault.UNLOCK_DELAY() + 1);
        vm.expectRevert();
        vm.prank(alice);
        stakeVault.release(alice);
    }

    // ── slash ─────────────────────────────────────────────────────────────────

    function test_slash_success() public {
        _mintSBT(alice);
        address recipient = makeAddr("recipient");
        uint256 slashAmt  = 10e6;

        vm.prank(guardian);
        stakeVault.slash(alice, slashAmt, recipient);

        assertEq(usdc.balanceOf(recipient), slashAmt);
        ISBTStakeVault.StakeRecord memory rec = stakeVault.stakes(alice);
        assertEq(rec.amount, stakeVault.stakeAmount() - slashAmt);
    }

    function test_slash_revertsIfNoStake() public {
        vm.expectRevert(ISBTStakeVault.NoStakeFound.selector);
        vm.prank(guardian);
        stakeVault.slash(alice, 10e6, makeAddr("r"));
    }

    function test_slash_revertsIfInsufficient() public {
        _mintSBT(alice);
        uint256 overAmount = stakeVault.stakeAmount() + 1; // cache before prank
        vm.expectRevert(ISBTStakeVault.InsufficientStakeBalance.selector);
        vm.prank(guardian);
        stakeVault.slash(alice, overAmount, makeAddr("r"));
    }

    function test_slash_onlyGuardian() public {
        _mintSBT(alice);
        vm.expectRevert();
        vm.prank(alice);
        stakeVault.slash(alice, 10e6, makeAddr("r"));
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    /// @dev Slashing any amount ≤ staked leaves the remainder exactly correct.
    function testFuzz_slash_reducesStakeByExactAmount(uint256 slashAmt) public {
        _mintSBT(alice);
        uint256 staked = stakeVault.stakeAmount();
        vm.assume(slashAmt > 0 && slashAmt <= staked);

        vm.prank(guardian);
        stakeVault.slash(alice, slashAmt, makeAddr("recipient"));

        assertEq(stakeVault.stakes(alice).amount, staked - slashAmt);
    }

    /// @dev Slashing more than the staked amount must always revert.
    function testFuzz_slash_revertsAboveStaked(uint256 excess) public {
        vm.assume(excess > 0 && excess < type(uint128).max);
        _mintSBT(alice);
        uint256 over = stakeVault.stakeAmount() + excess;
        vm.expectRevert(ISBTStakeVault.InsufficientStakeBalance.selector);
        vm.prank(guardian);
        stakeVault.slash(alice, over, makeAddr("r"));
    }

    /// @dev setStakeAmount persists any arbitrary value.
    function testFuzz_setStakeAmount_persists(uint128 newAmount) public {
        vm.assume(newAmount > 0);
        vm.prank(admin);
        stakeVault.setStakeAmount(newAmount);
        assertEq(stakeVault.stakeAmount(), newAmount);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function test_setStakeAmount_success() public {
        vm.prank(admin);
        stakeVault.setStakeAmount(100e6);
        assertEq(stakeVault.stakeAmount(), 100e6);
    }

    function test_setStakeAmount_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(alice);
        stakeVault.setStakeAmount(100e6);
    }

    function test_setStakeAmount_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ISBTStakeVault.StakeAmountUpdated(stakeVault.stakeAmount(), 100e6);
        vm.prank(admin);
        stakeVault.setStakeAmount(100e6);
    }
}
