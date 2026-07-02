// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultBase} from "../base/VaultBase.sol";
import {ILendingPool} from "../interfaces/ILendingPool.sol";
import {IScoreEngine} from "../interfaces/IScoreEngine.sol";
import {IReputationSBT} from "../interfaces/IReputationSBT.sol";
import {ICreditLineManager} from "../interfaces/ICreditLineManager.sol";
import {IInterestAccrualEngine} from "../interfaces/IInterestAccrualEngine.sol";
import {IReserveModule} from "../interfaces/IReserveModule.sol";
import {IFeeCollector} from "../interfaces/IFeeCollector.sol";
import {IWhitelistRegistry} from "../interfaces/IWhitelistRegistry.sol";
import {IRateLimiter} from "../interfaces/IRateLimiter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice ERC-4626 vault that lenders deposit into, and borrowers draw from.
 *         All limit logic is delegated to CreditLineManager.
 *         All interest math is delegated to InterestAccrualEngine.
 *         All fee routing is delegated to FeeCollector.
 *         Each loan advances through a 5-state FSM:
 *           Active → GracePeriod → Defaulted → WrittenOff
 *           Active → Repaid (terminal)
 */
contract LendingPool is VaultBase, ILendingPool {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant LIQUIDATION_MANAGER_ROLE = keccak256("LIQUIDATION_MANAGER_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant MAX_UTILISATION_BPS = 9_000; // 90 %
    uint256 public constant LOAN_DURATION        = 30 days;
    uint256 public constant GRACE_PERIOD         = 7 days;
    uint256 public constant LATE_SCORE_PENALTY   = 50;    // pts, immediate on grace trigger

    // ── Module addresses ──────────────────────────────────────────────────────
    address public sbtContract;
    address public scoreEngine;
    address public creditLineManager;
    address public interestAccrualEngine;
    address public reserveModule;
    address public feeCollector;
    address public whitelistRegistry;
    address public rateLimiter;

    // ── Loan storage ──────────────────────────────────────────────────────────
    uint256 private _nextLoanId;
    uint256 public  _totalOutstanding; // total principal outstanding across active loans

    mapping(uint256 => Loan) private _loans;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the LendingPool.
     * @param admin      Address granted all admin roles.
     * @param treasury_  Protocol treasury address.
     * @param usdc_      USDC token address (underlying ERC-4626 asset).
     */
    function initialize(address admin, address treasury_, address usdc_) external initializer {
        __ProtocolBase_init(admin, treasury_);
        __VaultBase_init(IERC20(usdc_), "TraceCredit LP", "tcUSDC", 1_500); // 15% reserve factor
    }

    // ── Module address setters (GOVERNOR_ROLE) ────────────────────────────────
    /// @notice Set the ReputationSBT contract address.
    /// @param addr New address.
    function setSbtContract(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        sbtContract = addr;
    }

    /// @notice Set the ScoreEngine address.
    /// @param addr New address.
    function setScoreEngine(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        scoreEngine = addr;
    }

    /// @notice Set the CreditLineManager address.
    /// @param addr New address.
    function setCreditLineManager(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        creditLineManager = addr;
    }

    /// @notice Set the InterestAccrualEngine address.
    /// @param addr New address.
    function setInterestAccrualEngine(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        interestAccrualEngine = addr;
    }

    /// @notice Set the ReserveModule address.
    /// @param addr New address.
    function setReserveModule(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        reserveModule = addr;
    }

    /// @notice Set the FeeCollector address.
    /// @param addr New address.
    function setFeeCollector(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        feeCollector = addr;
    }

    /// @notice Set the WhitelistRegistry address.
    /// @param addr New address.
    function setWhitelistRegistry(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        whitelistRegistry = addr;
    }

    /// @notice Set the RateLimiter address.
    /// @param addr New address.
    function setRateLimiter(address addr) external onlyRole(GOVERNOR_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        rateLimiter = addr;
    }

    // ── ILendingPool ──────────────────────────────────────────────────────────
    /**
     * @notice Borrow USDC. Checks: whitelist → rate limiter → SBT unfrozen → credit limit → utilisation.
     * @param amount USDC amount to borrow (6 decimals).
     * @return loanId Identifier of the new loan.
     */
    function borrow(uint256 amount) external nonReentrant whenNotPaused returns (uint256 loanId) {
        address borrower = msg.sender;

        // 1. Sanctions / geo gate (country code 0x0000 = "skip" in V1)
        if (whitelistRegistry != address(0)) {
            if (!IWhitelistRegistry(whitelistRegistry).isAllowed(borrower, bytes2(0))) {
                revert NotAllowed();
            }
        }

        // 2. SBT must exist and be unfrozen
        IReputationSBT sbt = IReputationSBT(sbtContract);
        if (!sbt.hasSBT(borrower) || sbt.isFrozen(borrower)) revert NoSBTOrFrozen();

        // 3. Tier and credit limit check
        IScoreEngine engine = IScoreEngine(scoreEngine);
        uint256 creditLimit = engine.getCreditLimit(borrower);
        if (amount > creditLimit) revert ExceedsCreditLimit();

        // 4. Rate limiter
        if (rateLimiter != address(0)) {
            uint8 tier = uint8(engine.getCreditTier(borrower));
            IRateLimiter(rateLimiter).checkAndRecord(borrower, amount, tier);
        }

        // 5. Pool utilisation must stay ≤ 90%
        _checkUtilisation(amount);

        // 6. Debit credit line
        ICreditLineManager(creditLineManager).debit(borrower, amount);

        // 7. Create loan
        uint256 rateBps = engine.getInterestRateBps(borrower);
        loanId = ++_nextLoanId;
        _loans[loanId] = Loan({
            borrower:        borrower,
            principal:       amount,
            interestRateBps: rateBps,
            startTime:       block.number,
            deadline:        block.timestamp + LOAN_DURATION,
            repaid:          0,
            accruedInterest: 0,
            state:           LoanState.Active
        });
        unchecked { _totalOutstanding += amount; }

        // 8. Transfer USDC to borrower
        IERC20(asset()).safeTransfer(borrower, amount);

        emit LoanCreated(loanId, borrower, amount, block.timestamp + LOAN_DURATION);
    }

    /**
     * @notice Repay outstanding principal + accrued interest on a loan.
     * @param loanId Loan identifier.
     * @param amount USDC amount to repay.
     */
    function repay(uint256 loanId, uint256 amount) external nonReentrant whenNotPaused {
        Loan storage loan = _loans[loanId];
        if (loan.state != LoanState.Active && loan.state != LoanState.GracePeriod) {
            revert LoanNotActive();
        }

        // Lazily transition to GracePeriod if deadline has passed
        if (loan.state == LoanState.Active && block.timestamp > loan.deadline) {
            _enterGracePeriod(loanId, loan);
        }

        // Compute current accrued interest
        uint256 interest = IInterestAccrualEngine(interestAccrualEngine).calcAccrued(
            loan.principal, loan.interestRateBps, block.number - loan.startTime
        );
        loan.accruedInterest = interest;

        uint256 outstanding = loan.principal + interest - loan.repaid;
        uint256 payment     = amount > outstanding ? outstanding : amount;

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), payment);
        loan.repaid += payment;

        // Credit the credit line
        uint256 principalPaid = payment > interest ? payment - interest : 0;
        if (principalPaid > 0) {
            ICreditLineManager(creditLineManager).credit(loan.borrower, principalPaid);
            if (_totalOutstanding >= principalPaid) {
                unchecked { _totalOutstanding -= principalPaid; }
            } else {
                _totalOutstanding = 0;
            }
        }

        bool fullRepayment = loan.repaid >= loan.principal + interest;
        if (fullRepayment) {
            loan.state = LoanState.Repaid;
            _settleInterest(loanId, interest);
            IScoreEngine(scoreEngine).processSignal(loan.borrower, IScoreEngine.SignalType.ON_TIME_REPAYMENT);
        }

        emit LoanRepaid(loanId, loan.borrower, payment, fullRepayment);
    }

    /// @notice Transition an overdue Active loan to GracePeriod. Callable by anyone.
    /// @param loanId Loan identifier.
    function triggerGracePeriod(uint256 loanId) external {
        Loan storage loan = _loans[loanId];
        if (loan.state != LoanState.Active) revert LoanNotActive();
        if (block.timestamp <= loan.deadline) revert DeadlineNotPassed();
        _enterGracePeriod(loanId, loan);
    }

    /// @notice Mark a loan as Defaulted after grace period expires. Called by LiquidationManager.
    /// @param loanId Loan identifier.
    function markDefaulted(uint256 loanId) external onlyRole(LIQUIDATION_MANAGER_ROLE) {
        Loan storage loan = _loans[loanId];
        if (loan.state != LoanState.GracePeriod) revert InvalidLoanState();
        if (block.timestamp <= loan.deadline + GRACE_PERIOD + 15) revert GracePeriodNotExpired();
        loan.state = LoanState.Defaulted;
        emit LoanDefaulted(loanId, loan.borrower, loan.principal - loan.repaid);
    }

    /// @notice Mark a loan as WrittenOff after liquidation is complete.
    /// @param loanId Loan identifier.
    function markWrittenOff(uint256 loanId) external onlyRole(LIQUIDATION_MANAGER_ROLE) {
        Loan storage loan = _loans[loanId];
        if (loan.state != LoanState.Defaulted) revert InvalidLoanState();
        loan.state = LoanState.WrittenOff;
        // Remove written-off principal from utilisation accounting so new
        // borrows are not blocked by debt that has already been absorbed by
        // the reserve.
        uint256 outstanding = loan.principal - loan.repaid;
        if (_totalOutstanding >= outstanding) {
            unchecked { _totalOutstanding -= outstanding; }
        } else {
            _totalOutstanding = 0;
        }
        emit LoanWrittenOff(loanId, loan.borrower);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns full loan details.
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return _loans[loanId];
    }

    /// @notice Returns pool utilisation ratio in bps (0–10000).
    function getUtilisationBps() external view returns (uint256) {
        return _utilisationBps();
    }

    /// @notice Returns total outstanding principal.
    function totalOutstanding() external view returns (uint256) {
        return _totalOutstanding;
    }

    // ── ERC-4626 overrides ────────────────────────────────────────────────────
    /**
     * @notice totalAssets includes outstanding loan principal so LP shares
     *         correctly appreciate as interest is collected.
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _totalOutstanding;
    }

    // ── VaultBase virtuals ────────────────────────────────────────────────────
    function _calcInterestRate(uint256 utilization) internal view override returns (uint256) {
        return IInterestAccrualEngine(interestAccrualEngine).calcRate(utilization);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────
    function _utilisationBps() internal view returns (uint256) {
        uint256 deposited = totalAssets();
        if (deposited == 0) return 0;
        return (_totalOutstanding * 10_000) / deposited;
    }

    function _checkUtilisation(uint256 additionalBorrow) internal view {
        uint256 deposited = totalAssets();
        if (deposited == 0) revert PoolUtilisationTooHigh();
        uint256 newUtil   = ((_totalOutstanding + additionalBorrow) * 10_000) / deposited;
        if (newUtil > MAX_UTILISATION_BPS) revert PoolUtilisationTooHigh();
    }

    function _enterGracePeriod(uint256 loanId, Loan storage loan) internal {
        loan.state = LoanState.GracePeriod;
        IScoreEngine(scoreEngine).processSignal(loan.borrower, IScoreEngine.SignalType.LATE_REPAYMENT);
        emit GracePeriodTriggered(loanId, loan.borrower);
    }

    function _settleInterest(uint256 loanId, uint256 interest) internal {
        if (interest == 0 || feeCollector == address(0)) return;
        (uint256 reserveCut, uint256 lpCut) = IInterestAccrualEngine(interestAccrualEngine)
            .calcFee(interest, reserveFactor);
        IERC20(asset()).safeTransfer(feeCollector, reserveCut);
        IFeeCollector(feeCollector).distributeFees(reserveCut);
        emit InterestSettled(loanId, reserveCut, lpCut);
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[40] private __gap;
}
