import {
  SignalProcessed,
  DecayApplied,
} from '../generated/ScoreEngine/ScoreEngine';
import { SignalEvent } from '../generated/schema';

/**
 * Fired when a signal (on-time repayment, wallet age, DAO vote etc.) is applied.
 * emit SignalProcessed(wallet, signal, delta)
 */
export function handleSignalProcessed(event: SignalProcessed): void {
  let id = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let signal = new SignalEvent(id);
  signal.wallet      = event.params.wallet;
  signal.signal      = event.params.signal;   // SignalType enum value (0=OnTimeRepayment etc.)
  signal.delta       = event.params.delta;
  signal.txHash      = event.transaction.hash;
  signal.blockNumber = event.block.number;
  signal.timestamp   = event.block.timestamp;
  signal.save();
}

/**
 * Fired when inactivity decay is applied to a wallet's score.
 * emit DecayApplied(wallet, delta)
 */
export function handleDecayApplied(event: DecayApplied): void {
  let id = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let signal = new SignalEvent(id);
  signal.wallet      = event.params.wallet;
  signal.signal      = 99;   // 99 = decay (not in enum, used as marker)
  signal.delta       = event.params.delta;
  signal.txHash      = event.transaction.hash;
  signal.blockNumber = event.block.number;
  signal.timestamp   = event.block.timestamp;
  signal.save();
}
