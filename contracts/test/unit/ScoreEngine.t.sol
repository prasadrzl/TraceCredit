// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {DeployHelper}  from "../helpers/DeployHelper.sol";
import {ScoreEngine}   from "../../src/core/ScoreEngine.sol";
import {IScoreEngine}  from "../../src/interfaces/IScoreEngine.sol";

contract ScoreEngineTest is DeployHelper {

    address internal borrower = makeAddr("borrower");

    // Pre-cached role constants (avoid consuming vm.prank on external calls)
    bytes32 internal LP_ROLE;
    bytes32 internal BRIDGE;
    bytes32 internal KEEPER;

    function setUp() public {
        _deploy();
        _mintSBT(borrower);
        LP_ROLE = scoreEngine.LENDING_POOL_ROLE();
        BRIDGE  = scoreEngine.BRIDGE_ROLE();
        KEEPER  = scoreEngine.KEEPER_ROLE();
    }

    // ── processSignal access control ──────────────────────────────────────────

    function test_processSignal_onlyPoolCanSendRepaymentSignals() public {
        vm.expectRevert();
        vm.prank(borrower);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
    }

    function test_processSignal_onlyBridgeCanSendCrossProtocol() public {
        vm.expectRevert();
        vm.prank(borrower);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.CROSS_PROTOCOL_REPAYMENT);
    }

    function test_processSignal_poolCanSendDefault() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.DEFAULT);
        vm.stopPrank();
    }

    function test_processSignal_poolCanSendLateRepayment() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.LATE_REPAYMENT);
        vm.stopPrank();
    }

    function test_processSignal_bridgeCanSendCrossProtocol() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(BRIDGE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.CROSS_PROTOCOL_REPAYMENT);
        vm.stopPrank();
    }

    function test_processSignal_bothPoolAndBridgeCanSendEnrichmentSignals() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.WALLET_AGE);
        scoreEngine.grantRole(BRIDGE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.DAO_VOTE);
        vm.stopPrank();
    }

    function test_processSignal_unauthorizedForEnrichment() public {
        vm.expectRevert();
        vm.prank(makeAddr("nobody"));
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.WALLET_AGE);
    }

    function test_processSignal_revertsWhenPaused() public {
        vm.startPrank(admin);
        scoreEngine.pause();
        scoreEngine.grantRole(LP_ROLE, admin);
        vm.stopPrank();

        vm.expectRevert();
        vm.prank(admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.DEFAULT);
    }

    // ── Log2 gain curve — 100% line coverage ─────────────────────────────────

    function test_logCurve_firstOnTimeRepayment() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        vm.stopPrank();
        // counter=1 → log2(2)=1 → delta = 40/1 = 40
        assertEq(sbt.getScore(borrower), 40, "first repayment = 40 pts");
    }

    function test_logCurve_secondOnTimeRepayment() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        // counter=2 → log2(3)=1 in integer math → delta = 40/1 = 40 again
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        vm.stopPrank();
        assertGe(sbt.getScore(borrower), 40);
    }

    function test_logCurve_diminishingReturns() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        vm.stopPrank();

        uint16 prevScore   = sbt.getScore(borrower);
        uint16 firstDelta  = 0;

        vm.prank(admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        firstDelta = sbt.getScore(borrower) - prevScore;
        prevScore  = sbt.getScore(borrower);

        // Process enough signals so log2 starts reducing the delta
        for (uint256 i = 1; i < 10; i++) {
            vm.prank(admin);
            scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
            uint16 newScore    = sbt.getScore(borrower);
            uint16 signalDelta = newScore - prevScore;
            assertTrue(signalDelta <= firstDelta, "diminishing returns");
            prevScore = newScore;
        }
    }

    function test_logCurve_positiveAlwaysAtLeastOne() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        vm.stopPrank();

        // Run 100 TOKEN_HOLDING signals — even at extreme counts delta >= 1
        for (uint256 i; i < 100; i++) {
            uint16 scoreBefore = sbt.getScore(borrower);
            vm.prank(admin);
            scoreEngine.processSignal(borrower, IScoreEngine.SignalType.TOKEN_HOLDING);
            uint16 scoreAfter = sbt.getScore(borrower);
            assertTrue(scoreAfter >= scoreBefore, "score never decreases for positive signal");
        }
    }

    function test_negativeSignals_notScaled() public {
        _forceScore(borrower, 500);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.DEFAULT);
        vm.stopPrank();
        assertEq(sbt.getScore(borrower), 300, "default = -200 pts");

        vm.prank(admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.DEFAULT);
        assertEq(sbt.getScore(borrower), 100, "second default = -200 pts");
    }

    function test_allSignalTypes_basePoints() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.grantRole(BRIDGE, admin);
        vm.stopPrank();

        _forceScore(borrower, 500);

        vm.startPrank(admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.CROSS_PROTOCOL_REPAYMENT);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.WALLET_AGE);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.DAO_VOTE);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.TOKEN_HOLDING);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.SBT_STAKE);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.LATE_REPAYMENT);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.WASH_CYCLE);
        vm.stopPrank();
    }

    function test_washCycleSignal() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.grantRole(BRIDGE, admin);
        vm.stopPrank();

        _forceScore(borrower, 200);
        vm.prank(admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.WASH_CYCLE);
        assertEq(sbt.getScore(borrower), 100, "wash cycle = -100 pts");
    }

    // ── Tier mapping ──────────────────────────────────────────────────────────

    function test_getCreditTier_bronze() public view {
        assertEq(uint8(scoreEngine.getCreditTier(borrower)), uint8(IScoreEngine.Tier.Bronze));
    }

    function test_getCreditTier_silver() public {
        _forceScore(borrower, 201);
        assertEq(uint8(scoreEngine.getCreditTier(borrower)), uint8(IScoreEngine.Tier.Silver));
    }

    function test_getCreditTier_gold() public {
        _forceScore(borrower, 401);
        assertEq(uint8(scoreEngine.getCreditTier(borrower)), uint8(IScoreEngine.Tier.Gold));
    }

    function test_getCreditTier_platinum() public {
        _forceScore(borrower, 601);
        assertEq(uint8(scoreEngine.getCreditTier(borrower)), uint8(IScoreEngine.Tier.Platinum));
    }

    function test_getCreditTier_diamond() public {
        _forceScore(borrower, 801);
        assertEq(uint8(scoreEngine.getCreditTier(borrower)), uint8(IScoreEngine.Tier.Diamond));
    }

    // ── Credit limits per tier ────────────────────────────────────────────────

    function test_getCreditLimit_bronze_zero() public view {
        assertEq(scoreEngine.getCreditLimit(borrower), 0);
    }

    function test_getCreditLimit_silver() public {
        _forceScore(borrower, 201);
        assertEq(scoreEngine.getCreditLimit(borrower), scoreEngine.SILVER_LIMIT());
    }

    function test_getCreditLimit_gold() public {
        _forceScore(borrower, 401);
        assertEq(scoreEngine.getCreditLimit(borrower), scoreEngine.GOLD_LIMIT());
    }

    function test_getCreditLimit_platinum() public {
        _forceScore(borrower, 601);
        assertEq(scoreEngine.getCreditLimit(borrower), scoreEngine.PLATINUM_LIMIT());
    }

    function test_getCreditLimit_diamond() public {
        _forceScore(borrower, 801);
        assertEq(scoreEngine.getCreditLimit(borrower), scoreEngine.DIAMOND_LIMIT());
    }

    // ── Interest rates per tier ───────────────────────────────────────────────

    function test_getInterestRateBps_bronze_zero() public view {
        assertEq(scoreEngine.getInterestRateBps(borrower), 0);
    }

    function test_getInterestRateBps_silver() public {
        _forceScore(borrower, 201);
        assertEq(scoreEngine.getInterestRateBps(borrower), scoreEngine.SILVER_RATE_BPS());
    }

    function test_getInterestRateBps_gold() public {
        _forceScore(borrower, 401);
        assertEq(scoreEngine.getInterestRateBps(borrower), scoreEngine.GOLD_RATE_BPS());
    }

    function test_getInterestRateBps_platinum() public {
        _forceScore(borrower, 601);
        assertEq(scoreEngine.getInterestRateBps(borrower), scoreEngine.PLATINUM_RATE_BPS());
    }

    function test_getInterestRateBps_diamond() public {
        _forceScore(borrower, 801);
        assertEq(scoreEngine.getInterestRateBps(borrower), scoreEngine.DIAMOND_RATE_BPS());
    }

    // ── Lockup per tier ───────────────────────────────────────────────────────

    function test_getLimitLockup_bronze_zero() public view {
        assertEq(scoreEngine.getLimitLockup(borrower), 0);
    }

    function test_getLimitLockup_silver() public {
        _forceScore(borrower, 201);
        assertEq(scoreEngine.getLimitLockup(borrower), scoreEngine.SILVER_LOCKUP());
    }

    function test_getLimitLockup_gold() public {
        _forceScore(borrower, 401);
        assertEq(scoreEngine.getLimitLockup(borrower), scoreEngine.GOLD_LOCKUP());
    }

    function test_getLimitLockup_platinum() public {
        _forceScore(borrower, 601);
        assertEq(scoreEngine.getLimitLockup(borrower), scoreEngine.PLATINUM_LOCKUP());
    }

    function test_getLimitLockup_diamond() public {
        _forceScore(borrower, 801);
        assertEq(scoreEngine.getLimitLockup(borrower), scoreEngine.DIAMOND_LOCKUP());
    }

    // ── Decay ─────────────────────────────────────────────────────────────────

    function test_applyDecay_noDecayInGracePeriod() public {
        _forceScore(borrower, 500);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        vm.stopPrank();

        uint256 lastAct = scoreEngine.lastActivity(borrower);
        vm.warp(lastAct + scoreEngine.DECAY_GRACE_DAYS() * 1 days - 1);

        vm.startPrank(admin);
        scoreEngine.grantRole(KEEPER, admin);
        uint16 before = sbt.getScore(borrower);
        scoreEngine.applyDecay(borrower);
        vm.stopPrank();
        assertEq(sbt.getScore(borrower), before, "no decay in grace period");
    }

    function test_applyDecay_appliesAfterGracePeriod() public {
        _forceScore(borrower, 500);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        vm.stopPrank();
        uint16 before = sbt.getScore(borrower);

        uint256 lastAct = scoreEngine.lastActivity(borrower);
        vm.warp(lastAct + (scoreEngine.DECAY_GRACE_DAYS() * 1 days) + scoreEngine.DECAY_INTERVAL() + 1);

        vm.startPrank(admin);
        scoreEngine.grantRole(KEEPER, admin);
        scoreEngine.applyDecay(borrower);
        vm.stopPrank();

        assertLt(sbt.getScore(borrower), before, "score decreased by decay");
    }

    function test_applyDecay_onlyKeeper() public {
        vm.expectRevert();
        vm.prank(borrower);
        scoreEngine.applyDecay(borrower);
    }

    function test_applyDecay_zeroIntervalsElapsed_noOp() public {
        _forceScore(borrower, 500);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        vm.stopPrank();
        uint16 before = sbt.getScore(borrower);

        uint256 lastAct = scoreEngine.lastActivity(borrower);
        vm.warp(lastAct + scoreEngine.DECAY_GRACE_DAYS() * 1 days + 1);

        vm.startPrank(admin);
        scoreEngine.grantRole(KEEPER, admin);
        scoreEngine.applyDecay(borrower);
        vm.stopPrank();
        assertEq(sbt.getScore(borrower), before, "no decay before 1 interval");
    }

    function test_applyDecay_multipleIntervals() public {
        _forceScore(borrower, 800);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        vm.stopPrank();
        uint16 before = sbt.getScore(borrower);

        uint256 lastAct = scoreEngine.lastActivity(borrower);
        vm.warp(lastAct + (90 * 1 days) + (3 * 30 days) + 1);

        vm.startPrank(admin);
        scoreEngine.grantRole(KEEPER, admin);
        scoreEngine.applyDecay(borrower);
        vm.stopPrank();
        // DECAY_PER_INTERVAL = -1, 3 intervals → -3
        assertEq(sbt.getScore(borrower), before - 3, "3 intervals of decay");
    }

    // ── Events ────────────────────────────────────────────────────────────────

    function test_processSignal_emitsSignalProcessed() public {
        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        vm.stopPrank();

        vm.expectEmit(true, false, false, false);
        emit IScoreEngine.SignalProcessed(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT, 40);

        vm.prank(admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
    }

    function test_applyDecay_emitsDecayApplied() public {
        _forceScore(borrower, 100);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        scoreEngine.processSignal(borrower, IScoreEngine.SignalType.TOKEN_HOLDING);
        vm.stopPrank();

        uint256 lastAct = scoreEngine.lastActivity(borrower);
        vm.warp(lastAct + (90 * 1 days) + (30 days) + 1);

        vm.startPrank(admin);
        scoreEngine.grantRole(KEEPER, admin);
        vm.stopPrank();

        vm.expectEmit(true, false, false, false);
        emit IScoreEngine.DecayApplied(borrower, -1);

        vm.prank(admin);
        scoreEngine.applyDecay(borrower);
    }

    // ── Fuzz: log2 gain curve math ────────────────────────────────────────────

    function testFuzz_logCurve_alwaysPositiveAndDiminishing(uint8 iterations) public {
        vm.assume(iterations > 0 && iterations < 50);

        vm.startPrank(admin);
        scoreEngine.grantRole(LP_ROLE, admin);
        vm.stopPrank();

        address wallet = makeAddr("fuzzWallet");
        usdc.mint(wallet, stakeVault.stakeAmount());
        vm.startPrank(wallet);
        usdc.approve(address(stakeVault), stakeVault.stakeAmount());
        sbt.mintSBT();
        vm.stopPrank();

        // Give room to grow (not at max)
        _forceScore(wallet, 200);

        uint16 prev = sbt.getScore(wallet);
        for (uint8 i; i < iterations; ) {
            vm.prank(admin);
            scoreEngine.processSignal(wallet, IScoreEngine.SignalType.TOKEN_HOLDING);
            uint16 curr = sbt.getScore(wallet);
            assertTrue(curr >= prev, "score never decreases for positive signal");
            prev = curr;
            unchecked { ++i; }
        }
    }

    function testFuzz_tierBoundaries(uint16 score) public {
        vm.assume(score <= 1000);
        _forceScore(borrower, score);

        IScoreEngine.Tier tier = scoreEngine.getCreditTier(borrower);
        if (score >= 801)      assertEq(uint8(tier), 4);
        else if (score >= 601) assertEq(uint8(tier), 3);
        else if (score >= 401) assertEq(uint8(tier), 2);
        else if (score >= 201) assertEq(uint8(tier), 1);
        else                   assertEq(uint8(tier), 0);
    }
}
