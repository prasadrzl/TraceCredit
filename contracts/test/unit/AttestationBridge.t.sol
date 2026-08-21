// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {AttestationBridge} from "../../src/oracle/AttestationBridge.sol";
import {IScoreEngine} from "../../src/interfaces/IScoreEngine.sol";

contract AttestationBridgeTest is DeployHelper {

    address internal attestor1 = makeAddr("attestor1");
    address internal attestor2 = makeAddr("attestor2");
    address internal attestor3 = makeAddr("attestor3");
    address internal wallet    = makeAddr("targetWallet");

    bytes32 internal ATTESTOR_ROLE;

    function setUp() public {
        _deploy();
        ATTESTOR_ROLE = bridge.ATTESTOR_ROLE();

        vm.startPrank(admin);
        bridge.addAttestor(attestor1);
        bridge.addAttestor(attestor2);
        bridge.addAttestor(attestor3);
        vm.stopPrank();

        _mintSBT(wallet);
    }

    // ── submitAttestation ─────────────────────────────────────────────────────

    function test_submitAttestation_quorumReached() public {
        uint8 signal = uint8(IScoreEngine.SignalType.CROSS_PROTOCOL_REPAYMENT);

        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev1");
        assertEq(sbt.getScore(wallet), 0, "no quorum yet");

        vm.prank(attestor2);
        bridge.submitAttestation(wallet, signal, "ev2");
        assertGt(sbt.getScore(wallet), 0, "score increased after quorum");
    }

    function test_submitAttestation_rejectsDoubleVote() public {
        uint8 signal = uint8(IScoreEngine.SignalType.WALLET_AGE);
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev1");

        vm.expectRevert(AttestationBridge.AlreadyVoted.selector);
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev2");
    }

    function test_submitAttestation_resetsExpiredWindow() public {
        uint8 signal = uint8(IScoreEngine.SignalType.WALLET_AGE);
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev1");

        vm.warp(block.timestamp + bridge.QUORUM_WINDOW() + 1);

        // Window is expired: count/firstAt are reset on the next call.
        // attestor1's voted flag persists in the nested mapping, so use attestor2.
        vm.prank(attestor2);
        bridge.submitAttestation(wallet, signal, "ev2");
    }

    function test_submitAttestation_onlyAttestor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        bridge.submitAttestation(wallet, 0, "ev");
    }

    function test_submitAttestation_invalidSignalType() public {
        vm.expectRevert(AttestationBridge.InvalidSignalType.selector);
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, 99, "ev");
    }

    function test_submitAttestation_revertsWhenPaused() public {
        vm.prank(admin);
        bridge.pause();
        vm.expectRevert();
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, 0, "ev");
    }

    // ── fulfillCrossProtocolData ──────────────────────────────────────────────

    function test_fulfillCrossProtocolData_multipleSignals() public {
        vm.prank(attestor1);
        bridge.fulfillCrossProtocolData(wallet, 3);
        assertGt(sbt.getScore(wallet), 0, "score increased");
    }

    function test_fulfillCrossProtocolData_zeroRepayments() public {
        vm.prank(attestor1);
        bridge.fulfillCrossProtocolData(wallet, 0);
        assertEq(sbt.getScore(wallet), 0);
    }

    function test_fulfillCrossProtocolData_onlyAttestor() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        bridge.fulfillCrossProtocolData(wallet, 1);
    }

    function test_fulfillCrossProtocolData_revertsWhenPaused() public {
        vm.prank(admin);
        bridge.pause();
        vm.expectRevert();
        vm.prank(attestor1);
        bridge.fulfillCrossProtocolData(wallet, 1);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function test_addAttestor_success() public {
        address newAttestor = makeAddr("newAtt");
        vm.prank(admin);
        bridge.addAttestor(newAttestor);
        assertTrue(bridge.hasRole(ATTESTOR_ROLE, newAttestor));
    }

    function test_addAttestor_zeroAddress() public {
        vm.expectRevert();
        vm.prank(admin);
        bridge.addAttestor(address(0));
    }

    function test_removeAttestor_success() public {
        vm.prank(admin);
        bridge.removeAttestor(attestor1);
        assertFalse(bridge.hasRole(ATTESTOR_ROLE, attestor1));
    }

    function test_setQuorum_success() public {
        vm.prank(admin);
        bridge.setQuorum(3);
        assertEq(bridge.requiredQuorum(), 3);
    }

    function test_setQuorum_revertsIfLessThan2() public {
        vm.expectRevert("Quorum must be >= 2");
        vm.prank(admin);
        bridge.setQuorum(1);
    }

    function test_initialize_revertsIfQuorumLessThan2() public {
        AttestationBridge bridgeImpl = new AttestationBridge();
        vm.expectRevert("Quorum must be >= 2");
        bridgeImpl.initialize(admin, treasury, address(scoreEngine), 1);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    /// @dev Any signal type value outside the enum range must revert.
    function testFuzz_submitAttestation_invalidSignalReverts(uint8 signal) public {
        uint8 maxValid = uint8(type(IScoreEngine.SignalType).max);
        vm.assume(signal > maxValid);
        vm.expectRevert(AttestationBridge.InvalidSignalType.selector);
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev");
    }

    /// @dev Valid signal types must always be accepted (no spurious revert).
    function testFuzz_submitAttestation_validSignalAccepted(uint8 signal) public {
        uint8 maxValid = uint8(type(IScoreEngine.SignalType).max);
        vm.assume(signal <= maxValid);
        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev");
    }

    /// @dev More repayments processed through fulfillCrossProtocolData → higher score (monotone).
    function testFuzz_fulfillCrossProtocolData_moreRepayments_higherScore(uint8 n) public {
        // n+1 is passed to the second call, so keep n+1 within MAX_REPAYMENTS_PER_CALL.
        vm.assume(n > 0 && uint256(n) + 1 <= bridge.MAX_REPAYMENTS_PER_CALL());

        address wallet2 = makeAddr("wallet2");
        _mintSBT(wallet2);

        vm.prank(attestor1);
        bridge.fulfillCrossProtocolData(wallet, n);

        vm.prank(attestor1);
        bridge.fulfillCrossProtocolData(wallet2, n + 1);

        assertLe(sbt.getScore(wallet), sbt.getScore(wallet2), "more repayments => score >= fewer");
    }

    /// @dev setQuorum below 2 must always revert regardless of value.
    function testFuzz_setQuorum_revertsBelow2(uint8 q) public {
        vm.assume(q < 2);
        vm.expectRevert("Quorum must be >= 2");
        vm.prank(admin);
        bridge.setQuorum(q);
    }

    // ── Three-attestor quorum ─────────────────────────────────────────────────

    function test_threeAttestorQuorum() public {
        vm.startPrank(admin);
        bridge.setQuorum(3);
        vm.stopPrank();

        uint8 signal = uint8(IScoreEngine.SignalType.DAO_VOTE);

        vm.prank(attestor1);
        bridge.submitAttestation(wallet, signal, "ev1");
        assertEq(sbt.getScore(wallet), 0);

        vm.prank(attestor2);
        bridge.submitAttestation(wallet, signal, "ev2");
        assertEq(sbt.getScore(wallet), 0);

        vm.prank(attestor3);
        bridge.submitAttestation(wallet, signal, "ev3");
        assertGt(sbt.getScore(wallet), 0, "quorum of 3 reached");
    }
}
