// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IFeeCollector} from "../interfaces/IFeeCollector.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice Splits interest income into configurable reserve, DAO, and LP portions.
 *         Extracting fee logic from LendingPool allows the DAO to adjust ratios
 *         and add new fee types without upgrading the vault contract.
 *
 *         Split invariant: reserveShareBps + daoShareBps + lpShareBps == 10000.
 *         LP share stays in LendingPool (accrues to LP token holders).
 */
contract FeeCollector is ProtocolBase, IFeeCollector {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20  public usdc;
    address public reserveModule;
    address public lendingPool;

    uint16 public reserveShareBps; // share routed to ReserveModule
    uint16 public daoShareBps;     // share routed to treasury
    uint16 public lpShareBps;      // share kept in LendingPool

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise FeeCollector with a default 15/5/80 split.
     * @param admin         Address granted all admin roles.
     * @param treasury_     Protocol treasury (DAO share destination).
     * @param usdc_         USDC token address.
     * @param reserveModule_ ReserveModule address for reserve cut routing.
     * @param lendingPool_  LendingPool address (LP share stays here).
     */
    function initialize(
        address admin,
        address treasury_,
        address usdc_,
        address reserveModule_,
        address lendingPool_
    ) external initializer {
        __ProtocolBase_init(admin, treasury_);
        if (usdc_          == address(0)) revert ZeroAddress();
        if (reserveModule_ == address(0)) revert ZeroAddress();
        if (lendingPool_   == address(0)) revert ZeroAddress();
        usdc          = IERC20(usdc_);
        reserveModule = reserveModule_;
        lendingPool   = lendingPool_;
        reserveShareBps = 1_500; // 15 %
        daoShareBps     =   500; //  5 %
        lpShareBps      = 8_000; // 80 %
    }

    // ── IFeeCollector ─────────────────────────────────────────────────────────
    /**
     * @notice Distribute total interest into reserve, DAO, and LP cuts.
     *         Caller must have already transferred USDC to this contract.
     *         Only LENDING_POOL_ROLE.
     * @param totalInterest Total interest to distribute (USDC, 6 decimals).
     */
    function distributeFees(uint256 totalInterest) external onlyRole(LENDING_POOL_ROLE) {
        if (totalInterest == 0) return;

        uint256 reserveCut = (totalInterest * uint256(reserveShareBps)) / 10_000;
        uint256 daoCut     = (totalInterest * uint256(daoShareBps))     / 10_000;
        uint256 lpCut      = totalInterest - reserveCut - daoCut;

        if (reserveCut > 0) usdc.safeTransfer(reserveModule, reserveCut);
        if (daoCut     > 0) usdc.safeTransfer(treasury,      daoCut);
        // LP cut stays in this contract — LendingPool pulls it back via a separate mechanism.

        emit FeesDistributed(reserveCut, daoCut, lpCut);
    }

    /**
     * @notice Update the fee split ratios. Must sum to 10000. Only GOVERNOR_ROLE.
     * @param reserve Reserve share in bps.
     * @param dao     DAO share in bps.
     * @param lp      LP share in bps.
     */
    function setFeeSplit(uint16 reserve, uint16 dao, uint16 lp) external onlyRole(GOVERNOR_ROLE) {
        if (uint256(reserve) + uint256(dao) + uint256(lp) != 10_000) revert SplitMustSumTo10000();
        reserveShareBps = reserve;
        daoShareBps     = dao;
        lpShareBps      = lp;
        emit FeeSplitUpdated(reserve, dao, lp);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
