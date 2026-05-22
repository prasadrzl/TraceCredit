// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the LendingPool ERC-4626 vault with loan FSM.
interface ILendingPool {
    // ── Types ─────────────────────────────────────────────────────────────────
    enum LoanState { Active, GracePeriod, Defaulted, Repaid, WrittenOff }

    struct Loan {
        address   borrower;
        uint256   principal;
        uint256   interestRateBps;
        uint256   startTime;
        uint256   deadline;
        uint256   repaid;
        uint256   accruedInterest;
        LoanState state;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 deadline);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool fullRepayment);
    event GracePeriodTriggered(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower, uint256 outstanding);
    event LoanWrittenOff(uint256 indexed loanId, address indexed borrower);
    event InterestSettled(uint256 indexed loanId, uint256 reserveCut, uint256 lpCut);

    // ── Errors ────────────────────────────────────────────────────────────────
    error NotAllowed();
    error NoSBTOrFrozen();
    error ExceedsCreditLimit();
    error PoolUtilisationTooHigh();
    error LoanNotActive();
    error InvalidLoanState();
    error DeadlineNotPassed();
    error GracePeriodNotExpired();

    // ── Mutative ──────────────────────────────────────────────────────────────
    /**
     * @notice Borrow USDC. Requires valid SBT, credit headroom, and pool utilisation < 90%.
     * @param amount USDC amount to borrow (6 decimals).
     * @return loanId Identifier of the new loan.
     */
    function borrow(uint256 amount) external returns (uint256 loanId);

    /// @notice Repay outstanding principal + interest on a loan.
    /// @param loanId Loan identifier.
    /// @param amount USDC amount to repay.
    function repay(uint256 loanId, uint256 amount) external;

    /// @notice Transition an overdue loan to GracePeriod. Callable by anyone.
    /// @param loanId Loan identifier.
    function triggerGracePeriod(uint256 loanId) external;

    /// @notice Mark a loan as Defaulted after the grace period expires. Called by LiquidationManager.
    /// @param loanId Loan identifier.
    function markDefaulted(uint256 loanId) external;

    /// @notice Mark a loan as WrittenOff after liquidation is complete.
    /// @param loanId Loan identifier.
    function markWrittenOff(uint256 loanId) external;

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns full loan details for a given loan ID.
    function getLoan(uint256 loanId) external view returns (Loan memory);

    /// @notice Returns pool utilisation ratio in bps (0–10000).
    function getUtilisationBps() external view returns (uint256);

    /// @notice Returns total outstanding principal across all active loans.
    function totalOutstanding() external view returns (uint256);
}
