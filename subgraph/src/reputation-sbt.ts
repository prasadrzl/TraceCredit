import { BigInt } from '@graphprotocol/graph-ts';
import {
  SBTMinted,
  SBTBurned,
  ScoreUpdated,
} from '../generated/ReputationSBT/ReputationSBT';
import { SBTHolder, ScoreUpdate } from '../generated/schema';

/**
 * Fired when a wallet mints their Reputation SBT (ERC-5192).
 * emit SBTMinted(wallet, tokenId)
 */
export function handleSBTMinted(event: SBTMinted): void {
  let holder = new SBTHolder(event.params.wallet.toHex());
  holder.wallet    = event.params.wallet;
  holder.tokenId   = event.params.tokenId;
  holder.active    = true;
  holder.mintedAt  = event.block.timestamp;
  holder.burnedAt  = null;
  holder.save();
}

/**
 * Fired when a wallet's SBT is burned (blacklisted after default).
 * emit SBTBurned(wallet, blacklistExpiry)
 */
export function handleSBTBurned(event: SBTBurned): void {
  let holder = SBTHolder.load(event.params.wallet.toHex());
  if (!holder) return;
  holder.active   = false;
  holder.burnedAt = event.block.timestamp;
  holder.save();
}

/**
 * Fired when a wallet's reputation score changes.
 * emit ScoreUpdated(wallet, newScore, delta)
 */
export function handleScoreUpdated(event: ScoreUpdated): void {
  let id = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let update = new ScoreUpdate(id);
  update.wallet      = event.params.wallet;
  update.newScore    = event.params.newScore;
  update.delta       = event.params.delta;
  update.txHash      = event.transaction.hash;
  update.blockNumber = event.block.number;
  update.timestamp   = event.block.timestamp;
  update.save();
}
