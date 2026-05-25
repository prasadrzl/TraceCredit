// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {IProtocolRegistry} from "../../src/interfaces/IProtocolRegistry.sol";
import {RegistryKeys} from "../../src/RegistryKeys.sol";

contract ProtocolRegistryTest is DeployHelper {

    function setUp() public {
        _deploy();
    }

    function test_setAddress_success() public {
        vm.prank(admin);
        registry.setAddress(RegistryKeys.REPUTATION_SBT, address(sbt));
        assertEq(registry.getAddress(RegistryKeys.REPUTATION_SBT), address(sbt));
    }

    function test_setAddress_onlyGovernor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        registry.setAddress(RegistryKeys.REPUTATION_SBT, address(sbt));
    }

    function test_setAddress_rejectsZero() public {
        vm.expectRevert();
        vm.prank(admin);
        registry.setAddress(RegistryKeys.REPUTATION_SBT, address(0));
    }

    function test_getAddress_revertsIfUnknown() public {
        vm.expectRevert();
        registry.getAddress(RegistryKeys.SCORE_ENGINE);
    }

    function test_setAddress_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit IProtocolRegistry.ContractRegistered(RegistryKeys.REPUTATION_SBT, address(sbt));
        vm.prank(admin);
        registry.setAddress(RegistryKeys.REPUTATION_SBT, address(sbt));
    }

    function test_canUpdateAddress() public {
        vm.prank(admin);
        registry.setAddress(RegistryKeys.LENDING_POOL, address(pool));
        address newPool = makeAddr("newPool");
        vm.prank(admin);
        registry.setAddress(RegistryKeys.LENDING_POOL, newPool);
        assertEq(registry.getAddress(RegistryKeys.LENDING_POOL), newPool);
    }
}
