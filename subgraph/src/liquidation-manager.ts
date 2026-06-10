import { LoanLiquidated } from '../generated/LiquidationManager/LiquidationManager';
import { Liquidation, Loan, ProtocolStats } from '../generated/schema';
import { BigInt } from '@graphprotocol/graph-ts';

/**
 * Fired when the keeper bot liquidates a defaulted loan.
 * emit LoanLiquidated(loanId, wallet, amount, timestamp)
 */
export function handleLoanLiquidated(event: LoanLiquidated): void {
  // 1. Create Liquidation entity
  let liquidation = new Liquidation(event.params.loanId.toString());
  liquidation.loan        = event.params.loanId.toString();
  liquidation.borrower    = event.params.wallet;
  liquidation.amount      = event.params.amount;
  liquidation.txHash      = event.transaction.hash;
  liquidation.blockNumber = event.block.number;
  liquidation.timestamp   = event.block.timestamp;
  liquidation.save();

  // 2. Update Loan status
  let loan = Loan.load(event.params.loanId.toString());
  if (loan) {
    loan.status = 'written_off';
    loan.save();
  }

  // 3. Update ProtocolStats
  let stats = ProtocolStats.load('global');
  if (!stats) return;
  stats.totalLiquidated  = stats.totalLiquidated.plus(event.params.amount);
  stats.lastUpdatedBlock = event.block.number;
  stats.save();
}
