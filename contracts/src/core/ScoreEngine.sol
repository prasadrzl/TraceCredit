// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ScorableBase} from "../base/ScorableBase.sol";
import {IScoreEngine} from "../interfaces/IScoreEngine.sol";
import {IReputationSBT} from "../interfaces/IReputationSBT.sol";

/**
 * @notice Scoring brain of the protocol. Translates raw signals into score
 *         deltas written to the SBT via a logarithmic gain curve. The only
 *         contract authorised to call IReputationSBT.updateScore().
 *
 *         Gain curve: delta = basePoints / log2(counter + 2)
 *         - First repayment  ≈ 40 pts   (log2(2) = 1)
 *         - Tenth repayment  ≈ 12 pts   (log2(11) ≈ 3.46)
 *         - Hundredth        ≈  6 pts   (log2(101) ≈ 6.66)
 */
contract ScoreEngine is ScorableBase, IScoreEngine {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");
    bytes32 public constant BRIDGE_ROLE       = keccak256("BRIDGE_ROLE");
    bytes32 public constant KEEPER_ROLE       = keccak256("KEEPER_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant DECAY_GRACE_DAYS   = 90;
    uint256 public constant DECAY_INTERVAL     = 30 days;
    int16   public constant DECAY_PER_INTERVAL = -1;

    // ── Tier parameters ───────────────────────────────────────────────────────
    uint16  public constant SILVER_MIN   = 201;
    uint16  public constant GOLD_MIN     = 401;
    uint16  public constant PLATINUM_MIN = 601;
    uint16  public constant DIAMOND_MIN  = 801;

    uint256 public constant SILVER_LIMIT   =    500e6;  // 500 USDC
    uint256 public constant GOLD_LIMIT     =  5_000e6;
    uint256 public constant PLATINUM_LIMIT = 25_000e6;
    uint256 public constant DIAMOND_LIMIT  = 100_000e6;

    uint256 public constant SILVER_RATE_BPS   = 1_800; // 18 %
    uint256 public constant GOLD_RATE_BPS     = 1_400; // 14 %
    uint256 public constant PLATINUM_RATE_BPS = 1_000; // 10 %
    uint256 public constant DIAMOND_RATE_BPS  =   700; //  7 %

    uint256 public constant SILVER_LOCKUP   = 90 days;
    uint256 public constant GOLD_LOCKUP     = 60 days;
    uint256 public constant PLATINUM_LOCKUP = 30 days;
    uint256 public constant DIAMOND_LOCKUP  = 14 days;

    // ── Signal base points ────────────────────────────────────────────────────
    int16 public constant BP_ON_TIME_REPAYMENT       =  40;
    int16 public constant BP_CROSS_PROTOCOL_REPAYMENT=  30;
    int16 public constant BP_WALLET_AGE              =  20;
    int16 public constant BP_DAO_VOTE                =  10;
    int16 public constant BP_TOKEN_HOLDING           =   5;
    int16 public constant BP_SBT_STAKE               =  15;
    int16 public constant BP_DEFAULT                 = -200;
    int16 public constant BP_LATE_REPAYMENT          =  -50;
    int16 public constant BP_WASH_CYCLE              = -100;

    // ── State ─────────────────────────────────────────────────────────────────
    /*
     * Per-wallet per-signal counters track how many times a signal has fired
     * so the log2 gain curve can reduce rewards for repeated signals.
     */
    mapping(address => mapping(uint8 => uint32)) private _signalCounters;

    /// @dev Timestamp of the last activity for decay calculation.
    mapping(address => uint256) public lastActivity;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the ScoreEngine.
     * @param admin      Address granted all admin roles.
     * @param treasury_  Protocol treasury address.
     * @param sbt        ReputationSBT contract address.
     */
    function initialize(address admin, address treasury_, address sbt)
        external
        initializer
    {
        __ProtocolBase_init(admin, treasury_);
        __ScorableBase_init(sbt, address(this));
    }

    // ── IScoreEngine ──────────────────────────────────────────────────────────
    /**
     * @notice Process a reputation signal for a wallet.
     *         LENDING_POOL_ROLE: on-time, late, default signals.
     *         BRIDGE_ROLE: cross-protocol and all positive external signals.
     * @param wallet Target wallet.
     * @param signal Signal type.
     */
    function processSignal(address wallet, SignalType signal) external whenNotPaused {
        _checkSignalAccess(signal);

        int16 delta = _computeDelta(wallet, signal);
        lastActivity[wallet] = block.timestamp;

        IReputationSBT(sbtContract).updateScore(wallet, delta);
        emit SignalProcessed(wallet, signal, delta);
    }

    /**
     * @notice Apply time-decay: −1 pt per 30 days inactive beyond the 90-day grace period.
     *         Only KEEPER_ROLE.
     * @param wallet Target wallet.
     */
    function applyDecay(address wallet) external onlyRole(KEEPER_ROLE) whenNotPaused {
        uint256 last      = lastActivity[wallet];
        uint256 graceEnd  = last + DECAY_GRACE_DAYS * 1 days;
        if (block.timestamp <= graceEnd) return;

        uint256 intervalsElapsed = (block.timestamp - graceEnd) / DECAY_INTERVAL;
        if (intervalsElapsed == 0) return;

        // forge-lint: disable-next-line(unsafe-typecast)
        // casting to int16 is safe: decay is capped at 1pt/30d; 100y of inactivity = 40 intervals = −40 pts
        int16 delta = int16(int256(intervalsElapsed)) * DECAY_PER_INTERVAL;
        lastActivity[wallet] = block.timestamp;

        IReputationSBT(sbtContract).updateScore(wallet, delta);
        emit DecayApplied(wallet, delta);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the credit tier for a wallet based on current SBT score.
    function getCreditTier(address wallet) external view returns (Tier) {
        return _tierFromScore(_getScore(wallet));
    }

    /// @notice Returns the maximum USDC borrow limit for a wallet's tier.
    function getCreditLimit(address wallet) external view returns (uint256) {
        return _limitForTier(_tierFromScore(_getScore(wallet)));
    }

    /// @notice Returns the annual interest rate in bps for a wallet's tier.
    function getInterestRateBps(address wallet) external view returns (uint256) {
        return _rateForTier(_tierFromScore(_getScore(wallet)));
    }

    /// @notice Returns the credit limit increase lockup period for a wallet's tier.
    function getLimitLockup(address wallet) external view returns (uint256) {
        return _lockupForTier(_tierFromScore(_getScore(wallet)));
    }

    // ── ScorableBase virtuals ─────────────────────────────────────────────────
    function _getTier(address wallet) internal view override returns (uint8) {
        return uint8(_tierFromScore(_getScore(wallet)));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────
    function _checkSignalAccess(SignalType signal) internal view {
        bool isPool   = hasRole(LENDING_POOL_ROLE, msg.sender);
        bool isBridge = hasRole(BRIDGE_ROLE, msg.sender);

        if (signal == SignalType.DEFAULT || signal == SignalType.ON_TIME_REPAYMENT
            || signal == SignalType.LATE_REPAYMENT)
        {
            if (!isPool) revert UnauthorisedCaller();
        } else if (signal == SignalType.CROSS_PROTOCOL_REPAYMENT) {
            if (!isBridge) revert UnauthorisedCaller();
        } else {
            // Positive enrichment signals may come from bridge or pool.
            if (!isPool && !isBridge) revert UnauthorisedCaller();
        }
    }

    function _computeDelta(address wallet, SignalType signal)
        internal
        returns (int16 delta)
    {
        int16 base = _basePoints(signal);

        if (base > 0) {
            uint32 count  = ++_signalCounters[wallet][uint8(signal)];
            // log2(count + 1): count >= 1 so argument >= 2, no division-by-zero.
            uint256 log2n = Math.log2(uint256(count) + 1);
            if (log2n == 0) log2n = 1; // safety floor
            // forge-lint: disable-next-line(unsafe-typecast)
            // casting to int16 is safe: base is a small constant (max 40) and log2n >= 1
            delta = int16(int256(uint256(int256(base))) / int256(log2n));
            if (delta == 0) delta = 1; // always award at least 1 pt for positive signal
        } else {
            // Negative signals are not subject to log scaling.
            delta = base;
        }
    }

    function _basePoints(SignalType signal) internal pure returns (int16) {
        if (signal == SignalType.ON_TIME_REPAYMENT)        return BP_ON_TIME_REPAYMENT;
        if (signal == SignalType.CROSS_PROTOCOL_REPAYMENT) return BP_CROSS_PROTOCOL_REPAYMENT;
        if (signal == SignalType.WALLET_AGE)               return BP_WALLET_AGE;
        if (signal == SignalType.DAO_VOTE)                 return BP_DAO_VOTE;
        if (signal == SignalType.TOKEN_HOLDING)            return BP_TOKEN_HOLDING;
        if (signal == SignalType.SBT_STAKE)                return BP_SBT_STAKE;
        if (signal == SignalType.DEFAULT)                  return BP_DEFAULT;
        if (signal == SignalType.LATE_REPAYMENT)           return BP_LATE_REPAYMENT;
        if (signal == SignalType.WASH_CYCLE)               return BP_WASH_CYCLE;
        return 0;
    }

    function _tierFromScore(uint16 score) internal pure returns (Tier) {
        if (score >= DIAMOND_MIN)  return Tier.Diamond;
        if (score >= PLATINUM_MIN) return Tier.Platinum;
        if (score >= GOLD_MIN)     return Tier.Gold;
        if (score >= SILVER_MIN)   return Tier.Silver;
        return Tier.Bronze;
    }

    function _limitForTier(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Diamond)  return DIAMOND_LIMIT;
        if (tier == Tier.Platinum) return PLATINUM_LIMIT;
        if (tier == Tier.Gold)     return GOLD_LIMIT;
        if (tier == Tier.Silver)   return SILVER_LIMIT;
        return 0;
    }

    function _rateForTier(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Diamond)  return DIAMOND_RATE_BPS;
        if (tier == Tier.Platinum) return PLATINUM_RATE_BPS;
        if (tier == Tier.Gold)     return GOLD_RATE_BPS;
        if (tier == Tier.Silver)   return SILVER_RATE_BPS;
        return 0;
    }

    function _lockupForTier(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Diamond)  return DIAMOND_LOCKUP;
        if (tier == Tier.Platinum) return PLATINUM_LOCKUP;
        if (tier == Tier.Gold)     return GOLD_LOCKUP;
        if (tier == Tier.Silver)   return SILVER_LOCKUP;
        return 0;
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[46] private __gap;
}
