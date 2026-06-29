import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { parseEventLogs } from 'viem';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { LiquidationService } from './liquidation.service';
import { ProtocolGateway } from '../gateway/gateway.service';
import { AppLogger } from '../logger/logger.service';
import { IndexerService } from '../indexer/indexer.service';
import { QUEUE_LIQUIDATION } from '../queue/queue.module';
import { LIQUIDATION_MANAGER_ABI } from '../contracts/abis';

export const JOB_LIQUIDATION_SCAN = 'liquidation:scan';
const BOT_REPEAT_INTERVAL_MS = 60_000; // 60 s

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
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.chain.walletClient) {
      this.logger.warn(
        'LiquidationBot: no wallet client configured — keeper disabled',
        'LiquidationBot',
      );
      return;
    }

    /** Schedule repeatable scan via BullMQ */
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

    /** Also run immediately on startup */
    this.scanAndLiquidate();

    this.logger.log('LiquidationBot keeper started (60s interval)', 'LiquidationBot');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.removeRepeatable(JOB_LIQUIDATION_SCAN, { every: BOT_REPEAT_INTERVAL_MS });
  }

  async scanAndLiquidate(): Promise<void> {
    const wc = this.chain.walletClient;
    if (!wc) return;

    try {
      const nowSec = Math.floor(Date.now() / 1000);
      /** Fetch loans whose dueTime is in the past — falls back to DB if subgraph is lagging */
      const overdueLoans = await this.indexer.getOverdueLoans(nowSec);

      if (overdueLoans.length === 0) {
        this.logger.debug('No overdue loans found', 'LiquidationBot');
        return;
      }

      this.logger.log(
        `Found ${overdueLoans.length} overdue loan(s) — submitting batchLiquidate`,
        'LiquidationBot',
      );

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

      /** Wait for confirmation */
      const receipt = await this.chain.publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        confirmations: 1,
        timeout: 120_000,
      });

      const nowTs = Math.floor(Date.now() / 1000);

      /** Parse LoanLiquidated events from the receipt to get real recovered/writtenOff amounts. */
      const liquidationLogs = parseEventLogs({
        abi: LIQUIDATION_MANAGER_ABI,
        eventName: 'LoanLiquidated',
        logs: receipt.logs,
      });

      /** Build loanId → amounts map for O(1) lookup per loan. */
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

      /** Record each liquidated loan in the DB and emit WS events. */
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

      this.logger.log(
        `Liquidated ${overdueLoans.length} loan(s) in block ${receipt.blockNumber}`,
        'LiquidationBot',
      );
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
}
