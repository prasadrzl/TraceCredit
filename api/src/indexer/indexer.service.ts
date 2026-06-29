import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseAbiItem } from 'viem';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { GraphService } from '../graph/graph.service';
import { AppLogger } from '../logger/logger.service';
import { ProtocolGateway } from '../gateway/gateway.service';
import { IndexerCheckpoint } from '../database/entities/indexer-checkpoint.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';

/** Max blocks per getLogs call — stay well under RPC node limits */
const MAX_BLOCKS_PER_CHUNK = 1_000n;

/** How many blocks behind the subgraph can be before we fall back to RPC getLogs */
const MAX_SUBGRAPH_LAG_BLOCKS = 50;

@Injectable()
export class IndexerService implements OnModuleInit {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly graph: GraphService,
    private readonly gateway: ProtocolGateway,
    private readonly logger: AppLogger,
    @InjectRepository(IndexerCheckpoint)
    private readonly checkpointRepo: Repository<IndexerCheckpoint>,
    @InjectRepository(LiquidationRecord)
    private readonly liqRepo: Repository<LiquidationRecord>,
    @InjectRepository(LoanSnapshot)
    private readonly loanRepo: Repository<LoanSnapshot>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Run catch-up non-blocking so it doesn't delay server startup
    this.runCatchUp().catch((err) =>
      this.logger.error(`IndexerService catch-up failed: ${err.message}`, err.stack, 'IndexerService'),
    );
  }

  // ─── Public: subgraph health ─────────────────────────────────────────────

  async isSubgraphHealthy(): Promise<boolean> {
    try {
      const [subgraphBlock, currentBlock] = await Promise.all([
        this.graph.getSubgraphBlock(),
        this.chain.getBlockNumber(),
      ]);
      if (subgraphBlock === null) return false;
      return Number(currentBlock) - subgraphBlock <= MAX_SUBGRAPH_LAG_BLOCKS;
    } catch {
      return false;
    }
  }

  // ─── Public: safe overdue-loan query with RPC fallback ───────────────────

  /**
   * Used by LiquidationBot instead of graph.getOverdueLoans() directly.
   * Falls back to DB query when the subgraph is lagging or down.
   */
  async getOverdueLoans(nowUnix: number): Promise<{ loanId: string; borrower: string; principal: string }[]> {
    const healthy = await this.isSubgraphHealthy();

    if (healthy) {
      const loans = await this.graph.getOverdueLoans(nowUnix);
      if (loans.length > 0 || !(await this.shouldFallback())) return loans;
    }

    this.logger.warn('Subgraph unhealthy or lagging — falling back to DB for overdue loans', 'IndexerService');
    return this.getOverdueLoansFromDb(nowUnix);
  }

  // ─── Catch-up orchestrator ────────────────────────────────────────────────

  private async runCatchUp(): Promise<void> {
    let currentBlock: bigint;
    try {
      currentBlock = await this.chain.getBlockNumber();
    } catch (err: any) {
      this.logger.warn(`IndexerService: cannot reach RPC for catch-up: ${err.message}`, 'IndexerService');
      return;
    }

    const addr = this.contracts.addr;

    await Promise.all([
      this.catchUpStream({
        streamKey: 'lendingPool:LoanCreated',
        address: addr.lendingPool,
        eventSignature: 'event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 principal, uint256 rateBps, uint256 dueTime)',
        currentBlock,
        handler: (logs) => this.handleLoanCreated(logs),
      }),
      this.catchUpStream({
        streamKey: 'lendingPool:LoanRepaid',
        address: addr.lendingPool,
        eventSignature: 'event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool fully)',
        currentBlock,
        handler: (logs) => this.handleLoanRepaid(logs),
      }),
      this.catchUpStream({
        streamKey: 'liquidationManager:LoanLiquidated',
        address: addr.liquidationManager,
        eventSignature: 'event LoanLiquidated(uint256 indexed loanId, address indexed borrower, uint256 recovered, uint256 writtenOff)',
        currentBlock,
        handler: (logs) => this.handleLoanLiquidated(logs),
      }),
      this.catchUpStream({
        streamKey: 'reputationSbt:ScoreUpdated',
        address: addr.reputationSbt,
        eventSignature: 'event ScoreUpdated(address indexed wallet, uint16 previousScore, uint16 newScore, uint8 tier)',
        currentBlock,
        handler: (logs) => this.handleScoreUpdated(logs),
      }),
    ]);

    this.logger.log(`IndexerService catch-up complete at block ${currentBlock}`, 'IndexerService');
  }

  // ─── Generic chunked getLogs processor ───────────────────────────────────

  private async catchUpStream(opts: {
    streamKey: string;
    address: `0x${string}`;
    eventSignature: string;
    currentBlock: bigint;
    handler: (logs: any[]) => Promise<void>;
  }): Promise<void> {
    const from = await this.getCheckpoint(opts.streamKey);
    const to = opts.currentBlock;

    if (from >= to) {
      this.logger.debug(`[${opts.streamKey}] already up to date at block ${to}`, 'IndexerService');
      return;
    }

    const event = parseAbiItem(opts.eventSignature) as any;
    let processed = 0;

    for (let start = from + 1n; start <= to; start += MAX_BLOCKS_PER_CHUNK) {
      const end = start + MAX_BLOCKS_PER_CHUNK - 1n > to ? to : start + MAX_BLOCKS_PER_CHUNK - 1n;

      try {
        const logs = await this.chain.publicClient.getLogs({
          address: opts.address,
          event,
          fromBlock: start,
          toBlock: end,
        });

        if (logs.length > 0) {
          await opts.handler(logs);
          processed += logs.length;
        }

        await this.updateCheckpoint(opts.streamKey, end);
      } catch (err: any) {
        this.logger.warn(
          `[${opts.streamKey}] getLogs failed (${start}→${end}): ${err.message} — stopping catch-up for this stream`,
          'IndexerService',
        );
        break;
      }
    }

    if (processed > 0) {
      this.logger.log(`[${opts.streamKey}] caught up ${processed} missed event(s) up to block ${to}`, 'IndexerService');
    }
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  private async handleLoanCreated(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId, borrower, principal, rateBps, dueTime } = log.args as {
        loanId: bigint; borrower: string; principal: bigint; rateBps: bigint; dueTime: bigint;
      };
      await this.loanRepo
        .createQueryBuilder()
        .insert()
        .into(LoanSnapshot)
        .values({
          loanId: loanId.toString(),
          borrower: borrower.toLowerCase(),
          principal: principal.toString(),
          accruedInterest: '0',
          dueAt: dueTime.toString(),
          status: LoanStatus.ACTIVE,
          rateBps: Number(rateBps),
          blockNumber: log.blockNumber?.toString() ?? '0',
        })
        .orIgnore()
        .execute();
    }
  }

  private async handleLoanRepaid(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId, fully } = log.args as { loanId: bigint; borrower: string; amount: bigint; fully: boolean };
      if (fully) {
        await this.loanRepo.update(
          { loanId: loanId.toString() },
          { status: LoanStatus.REPAID },
        );
      }
    }
  }

  private async handleLoanLiquidated(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId, borrower, recovered, writtenOff } = log.args as {
        loanId: bigint; borrower: string; recovered: bigint; writtenOff: bigint;
      };
      const blockTs = await this.blockTimestamp(log.blockNumber);
      await this.liqRepo
        .createQueryBuilder()
        .insert()
        .into(LiquidationRecord)
        .values({
          loanId: loanId.toString(),
          borrower: borrower.toLowerCase(),
          recoveredAmount: recovered.toString(),
          writtenOffAmount: writtenOff.toString(),
          txHash: log.transactionHash ?? '0x0',
          blockNumber: log.blockNumber?.toString() ?? '0',
          liquidatedAt: new Date(Number(blockTs) * 1000),
        })
        .orUpdate(
          ['recovered_amount', 'written_off_amount', 'block_number', 'liquidated_at'],
          ['tx_hash', 'loan_id'],
        )
        .execute();

      await this.loanRepo.update(
        { loanId: loanId.toString() },
        { status: LoanStatus.DEFAULTED },
      );
    }
  }

  private async handleScoreUpdated(logs: any[]): Promise<void> {
    const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    for (const log of logs) {
      const { wallet, previousScore, newScore, tier } = log.args as {
        wallet: string; previousScore: number; newScore: number; tier: number;
      };
      this.gateway.emitScoreUpdated({
        wallet: wallet.toLowerCase(),
        newScore: Number(newScore),
        previousScore: Number(previousScore),
        tier: TIER_NAMES[tier] ?? 'Unknown',
        timestamp: Date.now(),
      });
    }
  }

  // ─── Checkpoint helpers ───────────────────────────────────────────────────

  private async getCheckpoint(streamKey: string): Promise<bigint> {
    const row = await this.checkpointRepo.findOne({ where: { streamKey } });
    return BigInt(row?.lastProcessedBlock ?? '0');
  }

  private async updateCheckpoint(streamKey: string, block: bigint): Promise<void> {
    await this.checkpointRepo
      .createQueryBuilder()
      .insert()
      .into(IndexerCheckpoint)
      .values({ streamKey, lastProcessedBlock: block.toString() })
      .orUpdate(['last_processed_block', 'updated_at'], ['stream_key'])
      .execute();
  }

  // ─── DB fallback for overdue loans ───────────────────────────────────────

  private async getOverdueLoansFromDb(nowUnix: number): Promise<{ loanId: string; borrower: string; principal: string }[]> {
    return this.loanRepo
      .createQueryBuilder('ls')
      .select(['ls.loanId', 'ls.borrower', 'ls.principal'])
      .where('ls.status = :status', { status: LoanStatus.ACTIVE })
      .andWhere('CAST(ls.dueAt AS bigint) < :now', { now: nowUnix })
      .getMany();
  }

  private async shouldFallback(): Promise<boolean> {
    const count = await this.loanRepo.count({ where: { status: LoanStatus.ACTIVE } });
    return count > 0;
  }

  private async blockTimestamp(blockNumber: bigint | null): Promise<bigint> {
    if (!blockNumber) return BigInt(Math.floor(Date.now() / 1000));
    try {
      const block = await this.chain.publicClient.getBlock({ blockNumber });
      return block.timestamp;
    } catch {
      return BigInt(Math.floor(Date.now() / 1000));
    }
  }
}
