// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {ILiquidationManager} from "../interfaces/ILiquidationManager.sol";
import {ILendingPool} from "../interfaces/ILendingPool.sol";
import {IScoreEngine} from "../interfaces/IScoreEngine.sol";
import {ICreditLineManager} from "../interfaces/ICreditLineManager.sol";
import {IReserveModule} from "../interfaces/IReserveModule.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice Keeper-callable contract that resolves defaulted loans.
 *
 *         Full FSM transition handled internally:
 *           GracePeriod  → markDefaulted() → Defaulted  (if grace window expired)
 *           Defaulted    → markWrittenOff()             (after score slash + freeze + reserve)
 *
 *         Liquidation steps per loan:
 *           1. Auto-transition GracePeriod → Defaulted if eligible.
 *           2. processSignal(DEFAULT) → −200 pts on borrower SBT.
 *           3. freeze(wallet) → 12-month credit line freeze.
 *           4. absorbLoss(outstanding) → reserve writes off the debt.
 *           5. markWrittenOff(loanId) → terminal state.
 */
contract LiquidationManager is ProtocolBase, ILiquidationManager {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant KEEPER_ROLE          = keccak256("KEEPER_ROLE");
    bytes32 public constant LIQUIDATION_BOT_ROLE = keccak256("LIQUIDATION_BOT_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant GRACE_PERIOD = 7 days;

    // ── Errors ────────────────────────────────────────────────────────────────
    error Unauthorized();

    // ── Module addresses ──────────────────────────────────────────────────────
    address public lendingPool;
    address public scoreEngine;
    address public creditLineManager;
    address public reserveModule;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the LiquidationManager.
     * @param admin              Address granted all admin roles.
     * @param treasury_          Protocol treasury address.
     * @param lendingPool_       LendingPool address.
     * @param scoreEngine_       ScoreEngine address.
     * @param creditLineManager_ CreditLineManager address.
     * @param reserveModule_     ReserveModule address.
     */
    function initialize(
        address admin,
        address treasury_,
        address lendingPool_,
        address scoreEngine_,
        address creditLineManager_,
        address reserveModule_
    ) external initializer {
        __ProtocolBase_init(admin, treasury_);
        if (lendingPool_       == address(0)) revert ZeroAddress();
        if (scoreEngine_       == address(0)) revert ZeroAddress();
        if (creditLineManager_ == address(0)) revert ZeroAddress();
        if (reserveModule_     == address(0)) revert ZeroAddress();
        lendingPool       = lendingPool_;
        scoreEngine       = scoreEngine_;
        creditLineManager = creditLineManager_;
        reserveModule     = reserveModule_;
    }

    // ── ILiquidationManager ───────────────────────────────────────────────────
    /// @notice Liquidate a single loan. KEEPER_ROLE or LIQUIDATION_BOT_ROLE.
    /// @param loanId Loan identifier.
    function liquidate(uint256 loanId) external whenNotPaused {
        if (!hasRole(KEEPER_ROLE, msg.sender) && !hasRole(LIQUIDATION_BOT_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        _executeLiquidation(loanId);
    }

    /**
     * @notice Gas-efficient batch liquidation. Silently skips ineligible loans.
     * @param loanIds Array of loan identifiers to process.
     */
    function batchLiquidate(uint256[] calldata loanIds) external whenNotPaused {
        if (!hasRole(KEEPER_ROLE, msg.sender) && !hasRole(LIQUIDATION_BOT_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        uint256 len = loanIds.length;
        for (uint256 i; i < len; ) {
            try this.liquidateInternal(loanIds[i]) {} catch {}
            unchecked { ++i; }
        }
    }

    /// @dev Public entry point used by batchLiquidate via try/catch. Self-call only.
    function liquidateInternal(uint256 loanId) external {
        if (msg.sender != address(this)) revert Unauthorized();
        _executeLiquidation(loanId);
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    function _executeLiquidation(uint256 loanId) internal {
        ILendingPool pool = ILendingPool(lendingPool);
        ILendingPool.Loan memory loan = pool.getLoan(loanId);

        if (loan.state == ILendingPool.LoanState.WrittenOff) revert AlreadyLiquidated();

        // Auto-transition GracePeriod → Defaulted if the grace window has expired.
        // LendingPool.markDefaulted() requires LIQUIDATION_MANAGER_ROLE; only this
        // contract holds that role, so the keeper cannot call it directly.
        if (loan.state == ILendingPool.LoanState.GracePeriod) {
            if (block.timestamp <= loan.deadline + GRACE_PERIOD) revert GracePeriodStillActive();
            pool.markDefaulted(loanId);
            loan = pool.getLoan(loanId); // re-read after state change
        }

        if (loan.state != ILendingPool.LoanState.Defaulted) revert LoanNotDefaulted();

        uint256 outstanding = loan.principal - loan.repaid;

        // 1. Slash score −200 pts
        IScoreEngine(scoreEngine).processSignal(loan.borrower, IScoreEngine.SignalType.DEFAULT);

        // 2. Freeze credit line for 12 months
        ICreditLineManager(creditLineManager).freeze(loan.borrower);

        // 3. Record bad-debt absorption in the reserve
        IReserveModule(reserveModule).absorbLoss(outstanding);

        // 4. Finalise loan state → WrittenOff (also reduces pool._totalOutstanding)
        pool.markWrittenOff(loanId);

        emit LoanLiquidated(loanId, loan.borrower, outstanding, 0);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[46] private __gap;
}
