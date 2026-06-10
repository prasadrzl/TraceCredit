import { BigInt } from '@graphprotocol/graph-ts';
import {
  LoanCreated,
  LoanRepaid,
  GracePeriodTriggered,
  LoanDefaulted,
  LoanWrittenOff,
} from '../generated/LendingPool/LendingPool';
import { Loan, Repayment, Borrower, ProtocolStats } from '../generated/schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadOrCreateBorrower(wallet: string, timestamp: BigInt): Borrower {
  let borrower = Borrower.load(wallet);
  if (!borrower) {
    borrower = new Borrower(wallet);
    borrower.wallet = wallet as unknown as Uint8Array;
    borrower.totalBorrowed = BigInt.fromI32(0);
    borrower.totalRepaid = BigInt.fromI32(0);
    borrower.activeLoans = 0;
    borrower.totalLoans = 0;
    borrower.defaults = 0;
    borrower.firstLoanAt = timestamp;
    borrower.lastActivityAt = timestamp;
  }
  return borrower as Borrower;
}

function loadOrCreateProtocolStats(): ProtocolStats {
  let stats = ProtocolStats.load('global');
  if (!stats) {
    stats = new ProtocolStats('global');
    stats.totalBorrowed = BigInt.fromI32(0);
    stats.totalRepaid = BigInt.fromI32(0);
    stats.totalLiquidated = BigInt.fromI32(0);
    stats.activeLoansCount = BigInt.fromI32(0);
    stats.uniqueBorrowers = BigInt.fromI32(0);
    stats.lastUpdatedBlock = BigInt.fromI32(0);
  }
  return stats as ProtocolStats;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Fired when a borrower takes a new loan.
 * emit LoanCreated(loanId, borrower, amount, deadline)
 */
export function handleLoanCreated(event: LoanCreated): void {
  // 1. Create the Loan entity
  let loan = new Loan(event.params.loanId.toString());
  loan.loanId      = event.params.loanId;
  loan.borrower    = event.params.borrower;
  loan.principal   = event.params.amount;
  loan.rateBps     = BigInt.fromI32(0);   // not in event — fetched separately if needed
  loan.dueTime     = event.params.deadline;
  loan.status      = 'active';
  loan.txHash      = event.transaction.hash;
  loan.blockNumber = event.block.number;
  loan.timestamp   = event.block.timestamp;
  loan.save();

  // 2. Update Borrower totals
  let wallet = event.params.borrower.toHex();
  let borrower = loadOrCreateBorrower(wallet, event.block.timestamp);
  let isNew = borrower.totalLoans == 0;
  borrower.totalBorrowed   = borrower.totalBorrowed.plus(event.params.amount);
  borrower.activeLoans     = borrower.activeLoans + 1;
  borrower.totalLoans      = borrower.totalLoans + 1;
  borrower.lastActivityAt  = event.block.timestamp;
  borrower.save();

  // 3. Update global ProtocolStats
  let stats = loadOrCreateProtocolStats();
  stats.totalBorrowed    = stats.totalBorrowed.plus(event.params.amount);
  stats.activeLoansCount = stats.activeLoansCount.plus(BigInt.fromI32(1));
  if (isNew) stats.uniqueBorrowers = stats.uniqueBorrowers.plus(BigInt.fromI32(1));
  stats.lastUpdatedBlock = event.block.number;
  stats.save();
}

/**
 * Fired when a borrower makes a repayment (partial or full).
 * emit LoanRepaid(loanId, borrower, amount, fullRepayment)
 */
export function handleLoanRepaid(event: LoanRepaid): void {
  // 1. Update Loan status
  let loan = Loan.load(event.params.loanId.toString());
  if (!loan) return;
  if (event.params.fullRepayment) loan.status = 'repaid';
  loan.save();

  // 2. Create Repayment record (one per payment, not just final)
  let repaymentId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let repayment = new Repayment(repaymentId);
  repayment.loan          = loan.id;
  repayment.borrower      = event.params.borrower;
  repayment.amount        = event.params.amount;
  repayment.fullRepayment = event.params.fullRepayment;
  repayment.txHash        = event.transaction.hash;
  repayment.blockNumber   = event.block.number;
  repayment.timestamp     = event.block.timestamp;
  repayment.save();

  // 3. Update Borrower totals
  let borrower = Borrower.load(event.params.borrower.toHex());
  if (!borrower) return;
  borrower.totalRepaid   = borrower.totalRepaid.plus(event.params.amount);
  if (event.params.fullRepayment) borrower.activeLoans = borrower.activeLoans - 1;
  borrower.lastActivityAt = event.block.timestamp;
  borrower.save();

  // 4. Update ProtocolStats
  let stats = loadOrCreateProtocolStats();
  stats.totalRepaid = stats.totalRepaid.plus(event.params.amount);
  if (event.params.fullRepayment) {
    stats.activeLoansCount = stats.activeLoansCount.minus(BigInt.fromI32(1));
  }
  stats.lastUpdatedBlock = event.block.number;
  stats.save();
}

/**
 * Fired when a loan passes due date and enters the grace period.
 * emit GracePeriodTriggered(loanId, borrower)
 */
export function handleGracePeriodTriggered(event: GracePeriodTriggered): void {
  let loan = Loan.load(event.params.loanId.toString());
  if (!loan) return;
  loan.status = 'grace_period';
  loan.save();
}

/**
 * Fired when a loan is marked defaulted.
 * emit LoanDefaulted(loanId, borrower, outstanding)
 */
export function handleLoanDefaulted(event: LoanDefaulted): void {
  let loan = Loan.load(event.params.loanId.toString());
  if (!loan) return;
  loan.status = 'defaulted';
  loan.save();

  let borrower = Borrower.load(event.params.borrower.toHex());
  if (!borrower) return;
  borrower.defaults    = borrower.defaults + 1;
  borrower.activeLoans = borrower.activeLoans - 1;
  borrower.lastActivityAt = event.block.timestamp;
  borrower.save();

  let stats = loadOrCreateProtocolStats();
  stats.activeLoansCount = stats.activeLoansCount.minus(BigInt.fromI32(1));
  stats.lastUpdatedBlock = event.block.number;
  stats.save();
}

/**
 * Fired when a defaulted loan is written off after reserve absorption.
 * emit LoanWrittenOff(loanId, borrower)
 */
export function handleLoanWrittenOff(event: LoanWrittenOff): void {
  let loan = Loan.load(event.params.loanId.toString());
  if (!loan) return;
  loan.status = 'written_off';
  loan.save();
}
