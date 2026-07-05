import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseAbiItem } from 'viem';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { GraphService } from '../graph/graph.service';
import { AppLogger } from '../logger/logger.service';
import { ProtocolGateway } from '../gateway/gateway.service';
import { LENDING_POOL_ABI } from '../contracts/abis';
import { IndexerCheckpoint } from '../database/entities/indexer-checkpoint.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';
import { ScoreHistory } from '../database/entities/score-history.entity';
import { ScoreEvent, ScoreSignalType } from '../database/entities/score-event.entity';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

const SUBGRAPH_HEALTH_CACHE_MS = 15_000;
const MAX_BLOCKS_PER_CHUNK = 1_000n;
const MAX_SUBGRAPH_LAG_BLOCKS = 50;

// ScoreEngine.SignalType enum order from IScoreEngine.sol
const SIGNAL_TYPE_NAMES: Record<number, ScoreSignalType> = {
  0: ScoreSignalType.ON_TIME_REPAYMENT,
  1: ScoreSignalType.CROSS_PROTOCOL_REPAYMENT,
  2: ScoreSignalType.WALLET_AGE,
  3: ScoreSignalType.DAO_VOTE,
  4: ScoreSignalType.ATTESTATION_RECEIVED, // TOKEN_HOLDING
  5: ScoreSignalType.ATTESTATION_RECEIVED, // SBT_STAKE
  6: ScoreSignalType.LATE_REPAYMENT,       // DEFAULT (penalty)
  7: ScoreSignalType.LATE_REPAYMENT,
  8: ScoreSignalType.LATE_REPAYMENT,       // WASH_CYCLE
};

const SIGNAL_LABEL: Record<number, string> = {
  0: 'On-time repayment', 1: 'Cross-protocol repayment', 2: 'Wallet age',
  3: 'DAO vote', 4: 'Token holding', 5: 'SBT stake',
  6: 'Default', 7: 'Late repayment', 8: 'Wash cycle',
};

const SIGNAL_SOURCE_TYPE: Record<number, string> = {
  0: 'Repayment', 1: 'Cross-protocol', 2: 'Identity', 3: 'Governance',
  4: 'Passive', 5: 'Identity', 6: 'Penalty', 7: 'Repayment', 8: 'Penalty',
};

// ScoreEngine tier thresholds (from ScoreEngine.sol constants)
function scoreToTier(score: number): string {
  if (score >= 801) return 'Diamond';
  if (score >= 601) return 'Platinum';
  if (score >= 401) return 'Gold';
  if (score >= 201) return 'Silver';
  return 'Bronze';
}

interface LoanStruct {
  borrower: string; principal: bigint; interestRateBps: bigint;
  startTime: bigint; deadline: bigint; repaid: bigint;
  accruedInterest: bigint; state: number;
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private subgraphHealthCache: { value: boolean; expiresAt: number } | null = null;

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
    @InjectRepository(ScoreHistory)
    private readonly scoreHistoryRepo: Repository<ScoreHistory>,
    @InjectRepository(ScoreEvent)
    private readonly scoreEventRepo: Repository<ScoreEvent>,
    @InjectRepository(BorrowerProfile)
    private readonly profileRepo: Repository<BorrowerProfile>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.INDEXER_ENABLED === 'false') {
      this.logger.log('IndexerService: disabled via INDEXER_ENABLED=false — set to true to enable catch-up', 'IndexerService');
      return;
    }
    const lp = this.contracts.addr.lendingPool;
    if (!lp || BigInt(lp) <= 0xffn) {
      this.logger.warn('IndexerService: contract addresses are placeholders — catch-up skipped', 'IndexerService');
      return;
    }
    this.runCatchUp().catch((err) =>
      this.logger.error(`IndexerService catch-up failed: ${err.message}`, err.stack, 'IndexerService'),
    );
  }

  // ─── Public: subgraph health ─────────────────────────────────────────────

  async isSubgraphHealthy(): Promise<boolean> {
    const now = Date.now();
    if (this.subgraphHealthCache && now < this.subgraphHealthCache.expiresAt) {
      return this.subgraphHealthCache.value;
    }
    try {
      const [subgraphBlock, currentBlock] = await Promise.all([
        this.graph.getSubgraphBlock(),
        this.chain.getBlockNumber(),
      ]);
      const healthy = subgraphBlock !== null && Number(currentBlock) - subgraphBlock <= MAX_SUBGRAPH_LAG_BLOCKS;
      this.subgraphHealthCache = { value: healthy, expiresAt: now + SUBGRAPH_HEALTH_CACHE_MS };
      return healthy;
    } catch {
      this.subgraphHealthCache = { value: false, expiresAt: now + SUBGRAPH_HEALTH_CACHE_MS };
      return false;
    }
  }

  // ─── Public: overdue-loan query with subgraph/DB fallback ────────────────

  async getOverdueLoans(nowUnix: number): Promise<{ loanId: string; borrower: string; principal: string }[]> {
    const healthy = await this.isSubgraphHealthy();
    if (healthy) {
      const loans = await this.graph.getOverdueLoans(nowUnix);
      if (loans.length > 0 || !(await this.shouldFallback())) return loans;
    }
    this.logger.warn('Subgraph unhealthy or lagging — falling back to DB for overdue loans', 'IndexerService');
    return this.getOverdueLoansFromDb(nowUnix);
  }

  // ─── Public: SBT wallet list for decay sweep ─────────────────────────────

  async getSbtWallets(): Promise<string[]> {
    const profiles = await this.profileRepo.find({ where: { sbtMinted: true }, select: ['wallet'] });
    return profiles.map((p) => p.wallet);
  }

  // ─── Catch-up orchestrator ───────────────────────────────────────────────

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
      // ── LendingPool ───────────────────────────────────────────────────────
      this.catchUpStream({
        streamKey: 'lendingPool:LoanCreated',
        address: addr.lendingPool,
        eventSignature: 'event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 deadline)',
        currentBlock,
        handler: (logs) => this.handleLoanCreated(logs),
      }),
      this.catchUpStream({
        streamKey: 'lendingPool:LoanRepaid',
        address: addr.lendingPool,
        eventSignature: 'event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool fullRepayment)',
        currentBlock,
        handler: (logs) => this.handleLoanRepaid(logs),
      }),
      this.catchUpStream({
        streamKey: 'lendingPool:GracePeriodTriggered',
        address: addr.lendingPool,
        eventSignature: 'event GracePeriodTriggered(uint256 indexed loanId, address indexed borrower)',
        currentBlock,
        handler: (logs) => this.handleGracePeriodTriggered(logs),
      }),
      this.catchUpStream({
        streamKey: 'lendingPool:LoanDefaulted',
        address: addr.lendingPool,
        eventSignature: 'event LoanDefaulted(uint256 indexed loanId, address indexed borrower, uint256 outstanding)',
        currentBlock,
        handler: (logs) => this.handleLoanDefaulted(logs),
      }),
      this.catchUpStream({
        streamKey: 'lendingPool:LoanWrittenOff',
        address: addr.lendingPool,
        eventSignature: 'event LoanWrittenOff(uint256 indexed loanId, address indexed borrower)',
        currentBlock,
        handler: (logs) => this.handleLoanWrittenOff(logs),
      }),
      // ── LiquidationManager ────────────────────────────────────────────────
      this.catchUpStream({
        streamKey: 'liquidationManager:LoanLiquidated',
        address: addr.liquidationManager,
        eventSignature: 'event LoanLiquidated(uint256 indexed loanId, address indexed borrower, uint256 recovered, uint256 writtenOff)',
        currentBlock,
        handler: (logs) => this.handleLoanLiquidated(logs),
      }),
      // ── ReputationSBT ─────────────────────────────────────────────────────
      this.catchUpStream({
        streamKey: 'reputationSbt:ScoreUpdated',
        address: addr.reputationSbt,
        eventSignature: 'event ScoreUpdated(address indexed wallet, uint16 newScore, int16 delta)',
        currentBlock,
        handler: (logs) => this.handleScoreUpdated(logs),
      }),
      this.catchUpStream({
        streamKey: 'reputationSbt:SBTMinted',
        address: addr.reputationSbt,
        eventSignature: 'event SBTMinted(address indexed wallet, uint256 tokenId)',
        currentBlock,
        handler: (logs) => this.handleSbtMinted(logs),
      }),
      this.catchUpStream({
        streamKey: 'reputationSbt:SBTBurned',
        address: addr.reputationSbt,
        eventSignature: 'event SBTBurned(address indexed wallet, uint256 blacklistExpiry)',
        currentBlock,
        handler: (logs) => this.handleSbtBurned(logs),
      }),
      this.catchUpStream({
        streamKey: 'reputationSbt:SBTFrozen',
        address: addr.reputationSbt,
        eventSignature: 'event SBTFrozen(address indexed wallet)',
        currentBlock,
        handler: (logs) => this.handleSbtFrozen(logs),
      }),
      this.catchUpStream({
        streamKey: 'reputationSbt:SBTUnfrozen',
        address: addr.reputationSbt,
        eventSignature: 'event SBTUnfrozen(address indexed wallet)',
        currentBlock,
        handler: (logs) => this.handleSbtUnfrozen(logs),
      }),
      // ── ScoreEngine ───────────────────────────────────────────────────────
      this.catchUpStream({
        streamKey: 'scoreEngine:SignalProcessed',
        address: addr.scoreEngine,
        eventSignature: 'event SignalProcessed(address indexed wallet, uint8 indexed signal, int16 delta)',
        currentBlock,
        handler: (logs) => this.handleSignalProcessed(logs),
      }),
      this.catchUpStream({
        streamKey: 'scoreEngine:DecayApplied',
        address: addr.scoreEngine,
        eventSignature: 'event DecayApplied(address indexed wallet, int16 delta)',
        currentBlock,
        handler: (logs) => this.handleDecayApplied(logs),
      }),
    ]);

    this.logger.log(`IndexerService catch-up complete at block ${currentBlock}`, 'IndexerService');
  }

  // ─── Generic chunked getLogs processor ──────────────────────────────────

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

  // ─── LendingPool handlers ────────────────────────────────────────────────

  private async handleLoanCreated(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId, borrower, amount, deadline } = log.args as {
        loanId: bigint; borrower: string; amount: bigint; deadline: bigint;
      };
      await this.loanRepo
        .createQueryBuilder()
        .insert()
        .into(LoanSnapshot)
        .values({
          loanId: loanId.toString(),
          borrower: borrower.toLowerCase(),
          principal: amount.toString(),
          accruedInterest: '0',
          dueAt: deadline.toString(),
          status: LoanStatus.ACTIVE,
          rateBps: 0, // not emitted — enriched on first getLoan query
          blockNumber: log.blockNumber?.toString() ?? '0',
        })
        .orIgnore()
        .execute();
    }
  }

  private async handleLoanRepaid(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId, fullRepayment } = log.args as {
        loanId: bigint; borrower: string; amount: bigint; fullRepayment: boolean;
      };
      if (fullRepayment) {
        await this.loanRepo.update(
          { loanId: loanId.toString() },
          { status: LoanStatus.REPAID, accruedInterest: '0' },
        );
      } else {
        // Partial repayment — pull current on-chain state to update snapshot amounts
        try {
          const loan = await this.chain.publicClient.readContract({
            address: this.contracts.addr.lendingPool,
            abi: LENDING_POOL_ABI,
            functionName: 'getLoan',
            args: [loanId],
          }) as LoanStruct;
          await this.loanRepo.update(
            { loanId: loanId.toString() },
            {
              principal: loan.principal.toString(),
              accruedInterest: loan.accruedInterest.toString(),
            },
          );
        } catch (err: any) {
          this.logger.warn(`handleLoanRepaid: getLoan failed for ${loanId}: ${err.message}`, 'IndexerService');
        }
      }
    }
  }

  private async handleGracePeriodTriggered(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId } = log.args as { loanId: bigint; borrower: string };
      await this.loanRepo.update({ loanId: loanId.toString() }, { status: LoanStatus.GRACE_PERIOD });
    }
  }

  private async handleLoanDefaulted(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId } = log.args as { loanId: bigint; borrower: string; outstanding: bigint };
      await this.loanRepo.update({ loanId: loanId.toString() }, { status: LoanStatus.DEFAULTED });
    }
  }

  private async handleLoanWrittenOff(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { loanId } = log.args as { loanId: bigint; borrower: string };
      await this.loanRepo.update({ loanId: loanId.toString() }, { status: LoanStatus.WRITTEN_OFF });
    }
  }

  // ─── LiquidationManager handler ──────────────────────────────────────────

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

      // LiquidationManager calls markWrittenOff on LendingPool, but update here for safety
      await this.loanRepo.update(
        { loanId: loanId.toString() },
        { status: LoanStatus.WRITTEN_OFF },
      );
    }
  }

  // ─── ReputationSBT handlers ──────────────────────────────────────────────

  private async handleScoreUpdated(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet, newScore, delta } = log.args as {
        wallet: string; newScore: number; delta: number;
      };
      const walletLower = wallet.toLowerCase();
      const tier = scoreToTier(Number(newScore));
      const prevScore = Number(newScore) - Number(delta);
      const occurredAt = log.blockNumber
        ? new Date(Number(await this.blockTimestamp(log.blockNumber)) * 1000)
        : new Date();

      await this.scoreHistoryRepo.save({
        wallet: walletLower,
        score: Number(newScore),
        previousScore: prevScore,
        tier,
        source: 'on_chain',
        txHash: log.transactionHash ?? null,
        blockNumber: log.blockNumber?.toString() ?? null,
        recordedAt: occurredAt,
      });

      await this.profileRepo
        .createQueryBuilder()
        .insert()
        .into(BorrowerProfile)
        .values({ wallet: walletLower, score: Number(newScore), tier })
        .orUpdate(['score', 'tier'], ['wallet'])
        .execute();

      this.gateway.emitScoreUpdated({
        wallet: walletLower,
        newScore: Number(newScore),
        previousScore: prevScore,
        tier,
        timestamp: occurredAt.getTime(),
      });
    }
  }

  private async handleSbtMinted(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet, tokenId } = log.args as { wallet: string; tokenId: bigint };
      await this.profileRepo
        .createQueryBuilder()
        .insert()
        .into(BorrowerProfile)
        .values({ wallet: wallet.toLowerCase(), sbtMinted: true, sbtTokenId: tokenId.toString() })
        .orUpdate(['sbt_minted', 'sbt_token_id'], ['wallet'])
        .execute();
    }
  }

  private async handleSbtBurned(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet } = log.args as { wallet: string; blacklistExpiry: bigint };
      await this.profileRepo
        .createQueryBuilder()
        .update(BorrowerProfile)
        .set({ sbtMinted: false })
        .where('wallet = :w', { w: wallet.toLowerCase() })
        .execute();
    }
  }

  private async handleSbtFrozen(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet } = log.args as { wallet: string };
      this.gateway.emitCircuitBreaker({
        contract: 'ReputationSBT',
        event: 'SBTFrozen',
        details: wallet.toLowerCase(),
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  }

  private async handleSbtUnfrozen(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet } = log.args as { wallet: string };
      this.gateway.emitCircuitBreaker({
        contract: 'ReputationSBT',
        event: 'SBTUnfrozen',
        details: wallet.toLowerCase(),
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  }

  // ─── ScoreEngine handlers ────────────────────────────────────────────────

  private async handleSignalProcessed(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet, signal, delta } = log.args as { wallet: string; signal: number; delta: number };
      const walletLower = wallet.toLowerCase();
      const signalType = SIGNAL_TYPE_NAMES[signal] ?? ScoreSignalType.ATTESTATION_RECEIVED;
      const occurredAt = log.blockNumber
        ? new Date(Number(await this.blockTimestamp(log.blockNumber)) * 1000)
        : new Date();

      await this.scoreEventRepo.save({
        wallet: walletLower,
        signalType,
        signalSub: SIGNAL_LABEL[signal] ?? `signal_${signal}`,
        source: 'chain_event',
        sourceType: SIGNAL_SOURCE_TYPE[signal] ?? 'Passive',
        delta: Number(delta),
        scoreAfter: 0, // ScoreUpdated event carries the accurate new score
        txHash: log.transactionHash ?? null,
        blockNumber: log.blockNumber?.toString() ?? null,
        attestationUid: null,
        attestationPayload: null,
        occurredAt,
      });
    }
  }

  private async handleDecayApplied(logs: any[]): Promise<void> {
    for (const log of logs) {
      const { wallet, delta } = log.args as { wallet: string; delta: number };
      const occurredAt = log.blockNumber
        ? new Date(Number(await this.blockTimestamp(log.blockNumber)) * 1000)
        : new Date();

      await this.scoreEventRepo.save({
        wallet: wallet.toLowerCase(),
        signalType: ScoreSignalType.DECAY,
        signalSub: 'Score decay — inactivity',
        source: 'chain_event',
        sourceType: 'Passive',
        delta: Number(delta),
        scoreAfter: 0,
        txHash: log.transactionHash ?? null,
        blockNumber: log.blockNumber?.toString() ?? null,
        attestationUid: null,
        attestationPayload: null,
        occurredAt,
      });
    }
  }

  // ─── Checkpoint helpers ──────────────────────────────────────────────────

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

  // ─── DB fallback for overdue loans ──────────────────────────────────────

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
