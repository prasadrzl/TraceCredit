// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {IReserveModule} from "../../src/interfaces/IReserveModule.sol";

contract ReserveModuleTest is DeployHelper {

    address internal poolCaller = makeAddr("poolCaller");
    address internal strategy   = makeAddr("strategy");

    bytes32 internal LP_ROLE;

    function setUp() public {
        _deploy();
        LP_ROLE = reserve.LENDING_POOL_ROLE();
        vm.startPrank(admin);
        reserve.grantRole(LP_ROLE, poolCaller);
        vm.stopPrank();
    }

    // ── absorbLoss ────────────────────────────────────────────────────────────

    function test_absorbLoss_success() public {
        usdc.mint(address(reserve), 100e6);
        vm.prank(poolCaller);
        reserve.absorbLoss(50e6);
        assertEq(reserve.reserveBalance(), 100e6);
    }

    function test_absorbLoss_revertsIfInsufficientBalance() public {
        usdc.mint(address(reserve), 10e6);
        vm.expectRevert(IReserveModule.InsufficientReserve.selector);
        vm.prank(poolCaller);
        reserve.absorbLoss(50e6);
    }

    function test_absorbLoss_onlyLendingPool() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        reserve.absorbLoss(10e6);
    }

    // ── Strategy management ───────────────────────────────────────────────────

    function test_addStrategy_success() public {
        vm.prank(admin);
        reserve.addStrategy(strategy);
        assertTrue(reserve.isWhitelistedStrategy(strategy));
    }

    function test_addStrategy_zeroAddress() public {
        vm.expectRevert();
        vm.prank(admin);
        reserve.addStrategy(address(0));
    }

    function test_removeStrategy_success() public {
        vm.startPrank(admin);
        reserve.addStrategy(strategy);
        reserve.removeStrategy(strategy);
        vm.stopPrank();
        assertFalse(reserve.isWhitelistedStrategy(strategy));
    }

    function test_deployToStrategy_success() public {
        vm.prank(admin);
        reserve.addStrategy(strategy);

        uint256 floor = reserve.DEFAULT_MINIMUM_FLOOR();
        usdc.mint(address(reserve), floor + 100e6);

        vm.prank(admin);
        reserve.deployToStrategy(strategy, 100e6);
        assertEq(usdc.balanceOf(strategy), 100e6);
    }

    function test_deployToStrategy_revertsIfBelowFloor() public {
        vm.prank(admin);
        reserve.addStrategy(strategy);
        usdc.mint(address(reserve), reserve.DEFAULT_MINIMUM_FLOOR() + 1e6);

        vm.expectRevert(IReserveModule.BelowMinimumFloor.selector);
        vm.prank(admin);
        reserve.deployToStrategy(strategy, 2e6);
    }

    function test_deployToStrategy_revertsIfUnknown() public {
        vm.expectRevert(IReserveModule.UnknownStrategy.selector);
        vm.prank(admin);
        reserve.deployToStrategy(strategy, 10e6);
    }

    function test_withdrawFromStrategy_success() public {
        vm.prank(admin);
        reserve.addStrategy(strategy);

        uint256 floor = reserve.DEFAULT_MINIMUM_FLOOR();
        usdc.mint(address(reserve), floor + 100e6);
        vm.prank(admin);
        reserve.deployToStrategy(strategy, 100e6);

        vm.prank(strategy);
        usdc.approve(address(reserve), 100e6);
        vm.prank(admin);
        reserve.withdrawFromStrategy(strategy, 100e6);
        assertEq(usdc.balanceOf(strategy), 0);
    }

    function test_withdrawFromStrategy_revertsIfUnknown() public {
        vm.expectRevert(IReserveModule.UnknownStrategy.selector);
        vm.prank(admin);
        reserve.withdrawFromStrategy(strategy, 10e6);
    }

    // ── setMinimumReserveFloor ────────────────────────────────────────────────

    function test_setMinimumReserveFloor_success() public {
        vm.prank(admin);
        reserve.setMinimumReserveFloor(5_000e6);
        assertEq(reserve.minimumReserveFloor(), 5_000e6);
    }

    function test_setMinimumReserveFloor_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        reserve.setMinimumReserveFloor(5_000e6);
    }

    // ── reserveBalance ────────────────────────────────────────────────────────

    function test_reserveBalance_returnsUSDCBalance() public {
        usdc.mint(address(reserve), 500e6);
        assertEq(reserve.reserveBalance(), 500e6);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    /// @dev reserveBalance() always mirrors the contract's USDC balance exactly.
    function testFuzz_reserveBalance_mirrorsFungibleBalance(uint96 amount) public {
        usdc.mint(address(reserve), amount);
        assertEq(reserve.reserveBalance(), amount);
    }

    /// @dev absorbLoss reverts whenever loss > on-chain balance.
    function testFuzz_absorbLoss_revertsIfInsufficient(uint96 balance, uint96 loss) public {
        vm.assume(loss > balance);
        usdc.mint(address(reserve), balance);
        vm.expectRevert(IReserveModule.InsufficientReserve.selector);
        vm.prank(poolCaller);
        reserve.absorbLoss(loss);
    }

    /// @dev After a valid deploy, the remaining balance must stay at or above the floor.
    function testFuzz_deployToStrategy_neverDipsBeloFloor(uint96 extra) public {
        vm.assume(extra > 0 && extra < 10_000_000e6);

        uint256 floor = reserve.DEFAULT_MINIMUM_FLOOR();
        usdc.mint(address(reserve), floor + extra);

        vm.prank(admin);
        reserve.addStrategy(strategy);

        vm.prank(admin);
        reserve.deployToStrategy(strategy, extra);

        assertGe(reserve.reserveBalance(), floor);
    }
}
