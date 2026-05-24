// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployHelper} from "../helpers/DeployHelper.sol";
import {IScoreEngine} from "../../src/interfaces/IScoreEngine.sol";
import {ICreditLineManager} from "../../src/interfaces/ICreditLineManager.sol";

/**
 * @notice Integration: score lifecycle across repayments, oracle attestations,
 *         tier upgrades, and decay.
 *         Covers the reputation system end-to-end from a fresh wallet to Diamond.
 */
contract ScoreJourneyIntegrationTest is DeployHelper {

    address internal alice    = makeAddr("alice");
    address internal attestor1 = makeAddr("att1");
    address internal attestor2 = makeAddr("att2");
    address internal lp        = makeAddr("lp");
    address internal keeper    = makeAddr("keeper");

    bytes32 internal KEEPER_ROLE;

    function setUp() public {
        _deploy();
        vm.warp(1 days);

        KEEPER_ROLE = scoreEngine.KEEPER_ROLE();
        vm.startPrank(admin);
        scoreEngine.grantRole(KEEPER_ROLE, keeper);
        bridge.addAttestor(attestor1);
        bridge.addAttestor(attestor2);
        vm.stopPrank();

        _depositToPool(lp, 200_000e6);
        _mintSBT(alice);
    }

    // ── Bronze → Silver tier upgrade via repayments ───────────────────────────

    function test_onTimeRepayments_buildScoreToSilver() public {
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Bronze));

        // Manually push score above Silver threshold via repayment signals
        // (using _forceScore helper to skip full borrow setup overhead)
        _forceScore(alice, 201);
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Silver));
        assertEq(scoreEngine.getCreditLimit(alice), scoreEngine.SILVER_LIMIT());
    }

    function test_tierUpgrade_creditLineLimitIncreases() public {
        // Start at Silver
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();
        uint256 silverLimit = clm.getCreditLine(alice).limit;

        // Upgrade to Gold
        _forceScore(alice, 200); // add 200 → total 401
        vm.warp(block.timestamp + 61 days);
        vm.prank(alice);
        clm.requestIncrease();
        uint256 goldLimit = clm.getCreditLine(alice).limit;

        assertGt(goldLimit, silverLimit, "Gold limit must exceed Silver limit");
        assertEq(goldLimit, scoreEngine.GOLD_LIMIT());
    }

    function test_tierUpgrade_interestRateDrops() public {
        _forceScore(alice, 201);
        uint256 silverRate = scoreEngine.getInterestRateBps(alice);

        _forceScore(alice, 400); // total 601 = Platinum
        uint256 platinumRate = scoreEngine.getInterestRateBps(alice);

        assertLt(platinumRate, silverRate, "higher tier must have lower interest rate");
    }

    // ── Full four-tier progression ────────────────────────────────────────────

    function test_fullTierProgression_bronzeTodiamond() public {
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Bronze));

        _forceScore(alice, 201);
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Silver));

        _forceScore(alice, 200); // 401
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Gold));

        _forceScore(alice, 200); // 601
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Platinum));

        _forceScore(alice, 200); // 801
        assertEq(uint8(scoreEngine.getCreditTier(alice)), uint8(IScoreEngine.Tier.Diamond));
        assertEq(scoreEngine.getCreditLimit(alice), scoreEngine.DIAMOND_LIMIT());
    }

    // ── Oracle attestation → score boost ─────────────────────────────────────

    function test_attestationQuorum_updatesSBTScore() public {
        uint16 scoreBefore = sbt.getScore(alice);
        uint8 signal = uint8(IScoreEngine.SignalType.WALLET_AGE);

        vm.prank(attestor1);
        bridge.submitAttestation(alice, signal, "ev1");
        assertEq(sbt.getScore(alice), scoreBefore, "single attestor below quorum");

        vm.prank(attestor2);
        bridge.submitAttestation(alice, signal, "ev2");
        assertGt(sbt.getScore(alice), scoreBefore, "quorum reached: score must increase");
    }

    function test_crossProtocolData_multipleSignals() public {
        uint16 scoreBefore = sbt.getScore(alice);

        vm.prank(attestor1);
        bridge.fulfillCrossProtocolData(alice, 5); // 5 cross-protocol repayments

        assertGt(sbt.getScore(alice), scoreBefore);
    }

    function test_attestation_andRepayment_stackCorrectly() public {
        // Oracle boost first (alice already has SBT from setUp — skip _setupBorrower)
        vm.prank(attestor1);
        bridge.submitAttestation(alice, uint8(IScoreEngine.SignalType.WALLET_AGE), "ev1");
        vm.prank(attestor2);
        bridge.submitAttestation(alice, uint8(IScoreEngine.SignalType.WALLET_AGE), "ev2");

        uint16 scoreAfterOracle = sbt.getScore(alice);

        // Give alice Silver tier and credit line without calling _mintSBT again
        _forceScore(alice, 201);
        vm.warp(block.timestamp + 91 days);
        vm.prank(alice);
        clm.requestIncrease();

        vm.prank(alice);
        uint256 loanId = pool.borrow(100e6);

        uint256 repayAmt = 110e6;
        usdc.mint(alice, repayAmt);
        vm.prank(alice);
        usdc.approve(address(pool), repayAmt);
        vm.prank(alice);
        pool.repay(loanId, repayAmt);

        assertGt(sbt.getScore(alice), scoreAfterOracle, "on-chain repayment adds on top of oracle score");
    }

    // ── Score decay ───────────────────────────────────────────────────────────

    function test_decay_appliedAfterGracePeriod() public {
        _forceScore(alice, 300);
        // lastActivity is set when score is forced; trigger a real signal to set it
        vm.startPrank(admin);
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        scoreEngine.revokeRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        vm.stopPrank();

        uint16 scoreBeforeDecay = sbt.getScore(alice);

        // Wait beyond the 90-day grace period + 1 decay interval (30 days)
        vm.warp(block.timestamp + scoreEngine.DECAY_GRACE_DAYS() * 1 days + 31 days);

        vm.prank(keeper);
        scoreEngine.applyDecay(alice);

        assertLt(sbt.getScore(alice), scoreBeforeDecay, "decay must reduce score after inactivity");
    }

    function test_decay_noEffectWithinGracePeriod() public {
        _forceScore(alice, 300);
        vm.startPrank(admin);
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        scoreEngine.revokeRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        vm.stopPrank();

        uint16 scoreBeforeDecay = sbt.getScore(alice);

        // Stay within grace period (< 90 days)
        vm.warp(block.timestamp + 60 days);

        vm.prank(keeper);
        scoreEngine.applyDecay(alice);

        assertEq(sbt.getScore(alice), scoreBeforeDecay, "no decay within grace period");
    }

    function test_decay_multipleIntervals_reducesScore() public {
        _forceScore(alice, 400);
        vm.startPrank(admin);
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        scoreEngine.revokeRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        vm.stopPrank();

        uint16 scoreBefore = sbt.getScore(alice);

        // 90-day grace + 3 x 30-day intervals = 180 days total inactivity
        vm.warp(block.timestamp + scoreEngine.DECAY_GRACE_DAYS() * 1 days + 90 days + 1);

        vm.prank(keeper);
        scoreEngine.applyDecay(alice);

        uint16 scoreAfter = sbt.getScore(alice);
        // Must drop by 3 pts (3 intervals * 1 pt/interval)
        assertEq(uint256(scoreBefore) - uint256(scoreAfter), 3, "must decay 1 pt per 30-day interval");
    }

    // ── Log curve diminishing returns ─────────────────────────────────────────

    function test_logCurve_repeatedRepayments_everSmallerGains() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        vm.stopPrank();

        // 1st repayment: count=1, log2(2)=1, gain = 40/1 = 40
        uint16 s0 = sbt.getScore(alice);
        vm.prank(admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        uint16 gain1 = sbt.getScore(alice) - s0;

        // 2nd repayment: count=2, log2(3)=1 (integer), gain = 40/1 = 40 — equal to gain1
        // 3rd repayment: count=3, log2(4)=2,           gain = 40/2 = 20 — first drop
        vm.prank(admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        uint16 s2 = sbt.getScore(alice);
        vm.prank(admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        uint16 gain3 = sbt.getScore(alice) - s2;

        // After 10 repayments the gain is even smaller
        for (uint256 i; i < 7; i++) {
            vm.prank(admin);
            scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        }
        uint16 s10 = sbt.getScore(alice);
        vm.prank(admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        uint16 gain11 = sbt.getScore(alice) - s10;

        assertLt(gain3,  gain1,  "3rd gain must be smaller than 1st (log curve kicks in)");
        assertLt(gain11, gain3,  "11th gain must be smaller than 3rd (continued diminishing)");
    }

    // ── Score clamp ───────────────────────────────────────────────────────────

    function test_score_clampedAtMaxScore() public {
        // Force to near maximum
        _forceScore(alice, 990);

        // Try to push past 1000
        vm.startPrank(admin);
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        for (uint256 i; i < 20; i++) {
            scoreEngine.processSignal(alice, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        }
        scoreEngine.revokeRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        vm.stopPrank();

        assertLe(sbt.getScore(alice), sbt.MAX_SCORE(), "score must never exceed MAX_SCORE");
    }

    function test_score_clampedAtZero() public {
        // Default signal is -200 pts; even with score 0 it stays at 0
        vm.startPrank(admin);
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.DEFAULT);
        scoreEngine.processSignal(alice, IScoreEngine.SignalType.DEFAULT);
        scoreEngine.revokeRole(scoreEngine.LENDING_POOL_ROLE(), admin);
        vm.stopPrank();

        assertEq(sbt.getScore(alice), 0, "score must floor at 0");
    }
}
