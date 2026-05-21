// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILendingPool {
    // ── Events ───────────────────────────────────────────────────────────────
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool fullRepayment);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower, uint256 lostAmount);
    event GracePeriodStarted(uint256 indexed loanId, address indexed borrower);

    // ── Errors ───────────────────────────────────────────────────────────────
    error NoSBTOrFrozen();
    error ExceedsCreditLimit();
    error PoolUtilisationTooHigh();
    error LoanNotActive();
    error AlreadyDefaulted();
    error LoanNotExpired();

    // ── Types ────────────────────────────────────────────────────────────────
    enum LoanState { Active, GracePeriod, Defaulted, Repaid }

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestRateBps;
        uint256 startTime;
        uint256 deadline;
        uint256 repaid;
        LoanState state;
    }

    // ── Core ─────────────────────────────────────────────────────────────────
    function requestLoan(uint256 amount, uint256 durationSeconds) external returns (uint256 loanId);
    function repay(uint256 loanId, uint256 amount) external;
    function triggerGracePeriod(uint256 loanId) external;
    function triggerDefault(uint256 loanId) external;

    // ── Views ────────────────────────────────────────────────────────────────
    function getLoan(uint256 loanId) external view returns (Loan memory);
    function getUtilisationRatio() external view returns (uint256 bps);
    function getBorrowRate(uint256 utilisationBps) external pure returns (uint256 bps);
}
