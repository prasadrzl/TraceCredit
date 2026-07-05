import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { parseEventLogs } from 'viem';
import { ConfigService } from '@nestjs/config';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { LiquidationService } from './liquidation.service';
import { ProtocolGateway } from '../gateway/gateway.service';
import { AppLogger } from '../logger/logger.service';
import { IndexerService } from '../indexer/indexer.service';
import { QUEUE_LIQUIDATION } from '../queue/queue.module';
import { LIQUIDATION_MANAGER_ABI, SCORE_ENGINE_ABI } from '../contracts/abis';

export const JOB_LIQUIDATION_SCAN = 'liquidation:scan';
const BOT_REPEAT_INTERVAL_MS = 60_000; // 60 s

// ScoreEngine constants (mirror of ScoreEngine.sol)
const DECAY_GRACE_DAYS = 90;
const DECAY_INTERVAL_SECS = 30 * 24 * 3600; // 30 days in seconds

@Injectable()
export class LiquidationBot implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectQueue(QUEUE_LIQUIDATION) private readonly queue: Queue,
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly liquidationService: LiquidationService,
    private readonly gateway: ProtocolGateway,
    private readonly logger: AppLogger,
    private readonly indexer: IndexerService,
    private readonly config: ConfigService,
  ) {}

  private isValidContractAddress(addr: string): boolean {
    const n = BigInt(addr);
    return n > 0xffn;
  }

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('KEEPER_ENABLED') === 'false') {
      this.logger.warn('LiquidationBot: KEEPER_ENABLED=false — keeper disabled', 'LiquidationBot');
      return;
    }

    if (!this.chain.walletClient) {
      this.logger.warn('LiquidationBot: no wallet client configured — keeper disabled', 'LiquidationBot');
      return;
    }

    const lm = this.contracts.addr.liquidationManager;
    if (!lm || !this.isValidContractAddress(lm)) {
      this.logger.warn(
        `LiquidationBot: LIQUIDATION_MANAGER_ADDRESS is not a valid contract (got ${lm}) — keeper disabled`,
        'LiquidationBot',
      );
      return;
    }

    await this.queue.add(
      JOB_LIQUIDATION_SCAN,
      {},
      {
        repeat: { every: BOT_REPEAT_INTERVAL_MS },
        jobId: 'liquidation-keeper',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.scanAndLiquidate();
    this.logger.log('LiquidationBot keeper started (60s interval)', 'LiquidationBot');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.removeRepeatable(JOB_LIQUIDATION_SCAN, { every: BOT_REPEAT_INTERVAL_MS });
  }

  async scanAndLiquidate(): Promise<void> {
    const wc = this.chain.walletClient;
    if (!wc) return;

    await Promise.all([
      this.runLiquidationScan(wc),
      this.runDecaySweep(wc),
    ]);
  }

  // ─── Liquidation scan ─────────────────────────────────────────────────────

  private async runLiquidationScan(wc: NonNullable<typeof this.chain.walletClient>): Promise<void> {
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const overdueLoans = await this.indexer.getOverdueLoans(nowSec);

      if (overdueLoans.length === 0) {
        this.logger.debug('No overdue loans found', 'LiquidationBot');
        return;
      }

      this.logger.log(`Found ${overdueLoans.length} overdue loan(s) — submitting batchLiquidate`, 'LiquidationBot');

      const loanIds = overdueLoans.map((l) => BigInt(l.loanId));
      const lm = this.contracts.addr.liquidationManager;

      const { request } = await this.chain.publicClient.simulateContract({
        address: lm,
        abi: LIQUIDATION_MANAGER_ABI,
        functionName: 'batchLiquidate',
        args: [loanIds],
        account: wc.account!,
      });

      const txHash = await wc.writeContract(request as any);
      this.logger.log(`batchLiquidate submitted: tx=${txHash}`, 'LiquidationBot');

      const receipt = await this.chain.publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        confirmations: 1,
        timeout: 120_000,
      });

      const nowTs = Math.floor(Date.now() / 1000);

      const liquidationLogs = parseEventLogs({
        abi: LIQUIDATION_MANAGER_ABI,
        eventName: 'LoanLiquidated',
        logs: receipt.logs,
      });

      const amountsMap = new Map<string, { recovered: string; writtenOff: string }>();
      for (const log of liquidationLogs) {
        const { loanId, recovered, writtenOff } = log.args as {
          loanId: bigint;
          borrower: `0x${string}`;
          recovered: bigint;
          writtenOff: bigint;
        };
        amountsMap.set(loanId.toString(), {
          recovered: recovered.toString(),
          writtenOff: writtenOff.toString(),
        });
      }

      for (const loan of overdueLoans) {
        const amounts = amountsMap.get(loan.loanId) ?? {
          recovered: '0',
          writtenOff: loan.principal,
        };

        await this.liquidationService.recordLiquidation({
          loanId: loan.loanId,
          borrower: loan.borrower,
          recoveredAmount: amounts.recovered,
          writtenOffAmount: amounts.writtenOff,
          txHash: txHash as string,
          blockNumber: receipt.blockNumber.toString(),
          liquidatedAt: new Date(nowTs * 1000),
        });

        this.gateway.emitLoanLiquidated({
          loanId: loan.loanId,
          borrower: loan.borrower,
          recoveredAmount: amounts.recovered,
          txHash: txHash as string,
          timestamp: nowTs,
        });
      }

      this.logger.log(`Liquidated ${overdueLoans.length} loan(s) in block ${receipt.blockNumber}`, 'LiquidationBot');
    } catch (err: any) {
      this.logger.error(`LiquidationBot scan failed: ${err.message}`, err.stack, 'LiquidationBot');

      this.gateway.emitCircuitBreaker({
        contract: 'LiquidationManager',
        event: 'batchLiquidate:failed',
        details: err.message,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  }

  // ─── Decay sweep ──────────────────────────────────────────────────────────
  // Calls ScoreEngine.applyDecay(wallet) for wallets whose lastActivity is
  // older than DECAY_GRACE_DAYS + at least one DECAY_INTERVAL.
  // The contract is idempotent (no-ops if grace period hasn't expired), so
  // calling it on active wallets wastes gas; we pre-filter here.

  private async runDecaySweep(wc: NonNullable<typeof this.chain.walletClient>): Promise<void> {
    const se = this.contracts.addr.scoreEngine;
    if (!se || !this.isValidContractAddress(se)) return;

    try {
      const wallets = await this.indexer.getSbtWallets();
      if (wallets.length === 0) return;

      const nowSec = Math.floor(Date.now() / 1000);
      const decayThreshold = nowSec - (DECAY_GRACE_DAYS * 86400) - DECAY_INTERVAL_SECS;

      // Read lastActivity for each wallet; Promise.all for concurrency
      const lastActivityResults = await Promise.all(
        wallets.map((w) =>
          this.chain.publicClient
            .readContract({
              address: se as `0x${string}`,
              abi: SCORE_ENGINE_ABI,
              functionName: 'lastActivity',
              args: [w as `0x${string}`],
            })
            .then((v) => Number(v as bigint))
            .catch(() => 0),
        ),
      );

      const eligible: string[] = [];
      for (let i = 0; i < wallets.length; i++) {
        const lastActivity = lastActivityResults[i];
        if (lastActivity > 0 && lastActivity < decayThreshold) {
          eligible.push(wallets[i]);
        }
      }

      if (eligible.length === 0) {
        this.logger.debug('Decay sweep: no eligible wallets', 'LiquidationBot');
        return;
      }

      this.logger.log(`Decay sweep: calling applyDecay for ${eligible.length} wallet(s)`, 'LiquidationBot');

      // Process sequentially to avoid nonce conflicts
      for (const wallet of eligible) {
        try {
          const { request } = await this.chain.publicClient.simulateContract({
            address: se as `0x${string}`,
            abi: SCORE_ENGINE_ABI,
            functionName: 'applyDecay',
            args: [wallet as `0x${string}`],
            account: wc.account!,
          });
          const txHash = await wc.writeContract(request as any);
          this.logger.log(`applyDecay submitted for ${wallet}: tx=${txHash}`, 'LiquidationBot');
        } catch (err: any) {
          // Log and continue — one wallet failing shouldn't abort the sweep
          this.logger.warn(`applyDecay failed for ${wallet}: ${err.message}`, 'LiquidationBot');
        }
      }
    } catch (err: any) {
      this.logger.warn(`Decay sweep failed: ${err.message}`, 'LiquidationBot');
    }
  }
}
