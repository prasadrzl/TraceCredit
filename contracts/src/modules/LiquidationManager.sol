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
 *         Without this, Defaulted loans would remain stuck in the FSM.
 *
 *         Liquidation flow per loan:
 *           1. Assert state == Defaulted and grace period expired.
 *           2. processSignal(DEFAULT) → −200 pts on borrower SBT.
 *           3. freeze(wallet) → 12-month credit line freeze.
 *           4. absorbLoss(outstanding) → reserve writes off the debt.
 *           5. markWrittenOff(loanId) → terminal state.
 */
contract LiquidationManager is ProtocolBase, ILiquidationManager {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant KEEPER_ROLE           = keccak256("KEEPER_ROLE");
    bytes32 public constant LIQUIDATION_BOT_ROLE  = keccak256("LIQUIDATION_BOT_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant GRACE_PERIOD = 7 days;

    // ── Module addresses ──────────────────────────────────────────────────────
    address public lendingPool;
    address public scoreEngine;
    address public creditLineManager;
    address public reserveModule;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the LiquidationManager.
     * @param admin             Address granted all admin roles.
     * @param treasury_         Protocol treasury address.
     * @param lendingPool_      LendingPool address.
     * @param scoreEngine_      ScoreEngine address.
     * @param creditLineManager_ CreditLineManager address.
     * @param reserveModule_    ReserveModule address.
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
        lendingPool      = lendingPool_;
        scoreEngine      = scoreEngine_;
        creditLineManager = creditLineManager_;
        reserveModule    = reserveModule_;
    }

    // ── ILiquidationManager ───────────────────────────────────────────────────
    /// @notice Liquidate a single defaulted loan. KEEPER_ROLE or LIQUIDATION_BOT_ROLE.
    /// @param loanId Loan identifier.
    function liquidate(uint256 loanId) external whenNotPaused {
        if (!hasRole(KEEPER_ROLE, msg.sender) && !hasRole(LIQUIDATION_BOT_ROLE, msg.sender)) {
            revert ZeroAddress(); // reuse generic; separate error not needed for access
        }
        _executeLiquidation(loanId);
    }

    /**
     * @notice Gas-efficient batch liquidation. Silently skips already-liquidated loans.
     * @param loanIds Array of loan identifiers to process.
     */
    function batchLiquidate(uint256[] calldata loanIds) external whenNotPaused {
        if (!hasRole(KEEPER_ROLE, msg.sender) && !hasRole(LIQUIDATION_BOT_ROLE, msg.sender)) {
            revert ZeroAddress();
        }
        uint256 len = loanIds.length;
        for (uint256 i; i < len; ) {
            try this.liquidateInternal(loanIds[i]) {} catch {}
            unchecked { ++i; }
        }
    }

    /// @dev Public entry point used by batchLiquidate via try/catch.
    function liquidateInternal(uint256 loanId) external {
        if (msg.sender != address(this)) revert ZeroAddress();
        _executeLiquidation(loanId);
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    function _executeLiquidation(uint256 loanId) internal {
        ILendingPool.Loan memory loan = ILendingPool(lendingPool).getLoan(loanId);

        if (loan.state == ILendingPool.LoanState.WrittenOff) revert AlreadyLiquidated();
        if (loan.state != ILendingPool.LoanState.Defaulted)  revert LoanNotDefaulted();
        if (block.timestamp <= loan.deadline + GRACE_PERIOD)  revert GracePeriodStillActive();

        uint256 outstanding = loan.principal - loan.repaid;

        // 1. Slash score −200 pts
        IScoreEngine(scoreEngine).processSignal(loan.borrower, IScoreEngine.SignalType.DEFAULT);

        // 2. Freeze credit line for 12 months
        ICreditLineManager(creditLineManager).freeze(loan.borrower);

        // 3. Record bad-debt absorption
        IReserveModule(reserveModule).absorbLoss(outstanding);

        // 4. Finalise loan state
        ILendingPool(lendingPool).markWrittenOff(loanId);

        emit LoanLiquidated(loanId, loan.borrower, outstanding, block.timestamp);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[46] private __gap;
}
