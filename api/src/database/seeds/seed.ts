/**
 * Dev seed — run with:  npm run seed:dev
 *
 * Uses raw SQL for loan_snapshots and pool_stats so that
 * created_at / snapshotted_at are backdated correctly.
 * TypeORM's @CreateDateColumn ignores custom values at insert time,
 * which would collapse all volume onto today.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });

import { AppDataSource } from '../data-source';
import { BorrowerProfile }   from '../entities/borrower-profile.entity';
import { LiquidationRecord } from '../entities/liquidation-record.entity';
import { ScoreHistory }      from '../entities/score-history.entity';
import { ScoreEvent }        from '../entities/score-event.entity';
import { LpPosition }        from '../entities/lp-position.entity';
import { PriceSnapshot }     from '../entities/price-snapshot.entity';

// ─── Config ──────────────────────────────────────────────────────────────────
const MY_WALLET = '0x0de0b61e8815791ce462b8182a10e83d569fc13c';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fakeWallet(seed: number): string {
  const hex = (seed * 0xdeadbeef + 0xcafe).toString(16).padStart(40, '0').slice(0, 40);
  return `0x${hex}`;
}

function fakeTx(seed: number): string {
  const hex = (seed * 0xabcdef12 + 0x1234).toString(16).padStart(64, '0').slice(0, 64);
  return `0x${hex}`;
}

function iso(d: Date): string {
  return d.toISOString();
}

function tierFromScore(score: number): string {
  if (score >= 800) return 'Diamond';
  if (score >= 600) return 'Platinum';
  if (score >= 400) return 'Gold';
  if (score >= 200) return 'Silver';
  return 'Bronze';
}

function nextTierFromScore(score: number): { nextTier: string; nextTierScore: number } {
  if (score < 200) return { nextTier: 'Silver',   nextTierScore: 200 };
  if (score < 400) return { nextTier: 'Gold',     nextTierScore: 400 };
  if (score < 600) return { nextTier: 'Platinum', nextTierScore: 600 };
  if (score < 800) return { nextTier: 'Diamond',  nextTierScore: 800 };
  return { nextTier: 'Diamond', nextTierScore: 800 };
}

function creditLimitFromScore(score: number): number {
  if (score >= 800) return 100_000;
  if (score >= 600) return 50_000;
  if (score >= 400) return 10_000;
  if (score >= 200) return 2_000;
  return 500;
}

function rateBpsFromScore(score: number): number {
  if (score >= 800) return 700;
  if (score >= 600) return 1000;
  if (score >= 400) return 1400;
  if (score >= 200) return 1800;
  return 2400;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await AppDataSource.initialize();
  console.log('✅ Connected to dev database');

  await AppDataSource.query(`TRUNCATE
    price_snapshots, pool_stats, lp_positions,
    score_events, score_history, liquidation_records,
    loan_snapshots, borrower_profiles
    RESTART IDENTITY CASCADE`);
  console.log('🗑️  Cleared existing data');

  await seedPriceSnapshots();
  await seedPoolStats();
  await seedBorrowerProfiles();
  await seedLoanSnapshots();
  await seedLiquidationRecords();
  await seedScoreHistory();
  await seedScoreEvents();
  await seedLpPositions();

  console.log('\n🌱 Seed complete!');
  await AppDataSource.destroy();
}

// ─── 1. Price snapshots ───────────────────────────────────────────────────────
async function seedPriceSnapshots() {
  const repo = AppDataSource.getRepository(PriceSnapshot);
  const rows: Partial<PriceSnapshot>[] = [];

  for (let i = 0; i < 100; i++) {
    const price = (0.9998 + Math.random() * 0.0004).toFixed(8);
    rows.push({
      asset: 'USDC', priceUsd: price,
      rawAnswer: Math.round(parseFloat(price) * 1e8).toString(),
      roundId: (18_400_000 + i).toString(),
      recordedAt: daysAgo(99 - i),
    });
  }

  await repo.save(rows as PriceSnapshot[]);
  console.log(`  ✔ price_snapshots       ${rows.length} rows`);
}

// ─── 2. Pool stats — raw SQL to backdate snapshotted_at ──────────────────────
async function seedPoolStats() {
  const values: string[] = [];
  const params: any[] = [];
  let p = 1;
  let tvl = 40_000_000;

  for (let i = 0; i < 100; i++) {
    tvl += rnd(-200_000, 500_000);
    const borrowed   = Math.round(tvl * (0.55 + Math.random() * 0.2));
    const available  = tvl - borrowed;
    const utilBps    = Math.round((borrowed / tvl) * 10_000);
    const kinkBps    = 7000;
    const belowKink  = utilBps < kinkBps
      ? Math.round(400 + (utilBps / kinkBps) * 800)
      : Math.round(1200 + ((utilBps - kinkBps) / 3000) * 6000);
    const snapAt     = daysAgo(99 - i);

    values.push(
      `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`
    );
    params.push(
      tvl.toFixed(2), borrowed.toFixed(2), available.toFixed(2), utilBps,
      belowKink, belowKink + rnd(400, 800), kinkBps,
      Math.round(belowKink * 0.85),
      tvl.toFixed(2),
      rnd(60, 120),
      iso(snapAt),
    );
  }

  await AppDataSource.query(
    `INSERT INTO pool_stats
       (total_liquidity, borrowed, available, utilisation_bps,
        below_kink_apr_bps, above_kink_apr_bps, kink_bps,
        lp_apy_bps, total_value_locked, active_borrowers, snapshotted_at)
     VALUES ${values.join(', ')}`,
    params,
  );
  console.log(`  ✔ pool_stats            100 rows`);
}

// ─── 3. Borrower profiles ─────────────────────────────────────────────────────
async function seedBorrowerProfiles() {
  const repo = AppDataSource.getRepository(BorrowerProfile);
  const rows: Partial<BorrowerProfile>[] = [];

  const myScore = 650;
  const myLimit = 5_000;
  const myUsed  = 2_400;
  const { nextTier, nextTierScore } = nextTierFromScore(myScore);
  rows.push({
    wallet: MY_WALLET, score: myScore, tier: tierFromScore(myScore),
    creditLimit: myLimit.toFixed(2), creditUsed: myUsed.toFixed(2),
    interestRateBps: rateBpsFromScore(myScore),
    rateLimit24h: '1000.00', rateLimitUsed: '0.00',
    sbtMinted: true, sbtTokenId: '42', nextTier, nextTierScore,
  });

  for (let i = 1; i < 100; i++) {
    const score = rnd(50, 950);
    const limit = creditLimitFromScore(score);
    const used  = Math.round(limit * Math.random() * 0.8);
    const nt    = nextTierFromScore(score);
    rows.push({
      wallet: fakeWallet(i), score, tier: tierFromScore(score),
      creditLimit: limit.toFixed(2), creditUsed: used.toFixed(2),
      interestRateBps: rateBpsFromScore(score),
      rateLimit24h: (limit * 0.2).toFixed(2), rateLimitUsed: '0.00',
      sbtMinted: true, sbtTokenId: (100 + i).toString(),
      nextTier: nt.nextTier, nextTierScore: nt.nextTierScore,
    });
  }

  await repo.save(rows as BorrowerProfile[]);
  console.log(`  ✔ borrower_profiles     ${rows.length} rows`);
}

// ─── 4. Loan snapshots — raw SQL to backdate created_at / updated_at ──────────
async function seedLoanSnapshots() {
  const insertLoan = async (
    loanId: string,
    borrower: string,
    principal: string,
    accruedInterest: string,
    dueAt: string,
    status: string,
    rateBps: number,
    blockNumber: string,
    createdAt: Date,
    updatedAt: Date,
  ) => {
    await AppDataSource.query(
      `INSERT INTO loan_snapshots
         (loan_id, borrower, principal, accrued_interest, due_at, status, rate_bps, block_number, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (loan_id) DO NOTHING`,
      [loanId, borrower, principal, accruedInterest, dueAt, status, rateBps, blockNumber,
       iso(createdAt), iso(updatedAt)],
    );
  };

  // ── MY_WALLET: 12 loans ──
  const myLoans = [
    { loanId: '46', principal: '1500000000',  rateBps: 1400, status: 'active',       daysOpenedAgo: 23, termDays: 30 },
    { loanId: '45', principal: '480000000',   rateBps: 1800, status: 'grace_period', daysOpenedAgo: 34, termDays: 28 },
    { loanId: '44', principal: '2000000000',  rateBps: 1400, status: 'repaid',       daysOpenedAgo: 40, termDays: 30 },
    { loanId: '43', principal: '5000000000',  rateBps: 1400, status: 'repaid',       daysOpenedAgo: 52, termDays: 30 },
    { loanId: '42', principal: '2400000000',  rateBps: 1400, status: 'active',       daysOpenedAgo: 5,  termDays: 30 },
    { loanId: '41', principal: '1200000000',  rateBps: 1800, status: 'repaid',       daysOpenedAgo: 58, termDays: 28 },
    { loanId: '40', principal: '3500000000',  rateBps: 1400, status: 'repaid',       daysOpenedAgo: 65, termDays: 30 },
    { loanId: '38', principal: '2300000000',  rateBps: 1400, status: 'repaid',       daysOpenedAgo: 71, termDays: 30 },
    { loanId: '35', principal: '800000000',   rateBps: 1400, status: 'repaid',       daysOpenedAgo: 79, termDays: 25 },
    { loanId: '31', principal: '1100000000',  rateBps: 1800, status: 'repaid',       daysOpenedAgo: 88, termDays: 28 },
    { loanId: '28', principal: '700000000',   rateBps: 1400, status: 'repaid',       daysOpenedAgo: 95, termDays: 25 },
    { loanId: '24', principal: '1800000000',  rateBps: 1800, status: 'defaulted',    daysOpenedAgo: 110, termDays: 25 },
  ];

  for (const l of myLoans) {
    const openedAt = daysAgo(l.daysOpenedAgo);
    const dueAt    = addDays(openedAt, l.termDays);
    const dailyRate = (Number(l.principal) * l.rateBps) / (10_000 * 365);
    const interest  = Math.round(dailyRate * l.daysOpenedAgo);
    const updatedAt = l.status === 'repaid'
      ? addDays(openedAt, Math.round(l.termDays * 0.9))
      : new Date();

    await insertLoan(
      l.loanId, MY_WALLET, l.principal, interest.toString(),
      Math.floor(dueAt.getTime() / 1000).toString(),
      l.status, l.rateBps,
      (18_400_000 + Number(l.loanId) * 1000).toString(),
      openedAt, updatedAt,
    );
  }

  // ── 88 generated loans spread across 90 days ──
  const statuses = ['active', 'active', 'repaid', 'repaid', 'repaid', 'grace_period', 'defaulted'];
  const rates = [700, 1000, 1400, 1800, 2400];

  for (let i = 0; i < 88; i++) {
    const principal  = rnd(100, 50_000) * 1_000_000;
    const rateBps    = pick(rates);
    const daysOpen   = rnd(1, 90);
    const termDays   = pick([14, 21, 28, 30, 45, 60]);
    const openedAt   = daysAgo(daysOpen);
    const dueAt      = addDays(openedAt, termDays);
    const dailyRate  = (principal * rateBps) / (10_000 * 365);
    const status     = pick(statuses);
    const updatedAt  = status === 'repaid'
      ? addDays(openedAt, Math.round(termDays * 0.85))
      : new Date();

    await insertLoan(
      (200 + i).toString(),
      fakeWallet(i + 1),
      principal.toString(),
      Math.round(dailyRate * daysOpen).toString(),
      Math.floor(dueAt.getTime() / 1000).toString(),
      status, rateBps,
      (18_000_000 + rnd(0, 500_000)).toString(),
      openedAt, updatedAt,
    );
  }

  console.log(`  ✔ loan_snapshots        100 rows`);
}

// ─── 5. Liquidation records ───────────────────────────────────────────────────
async function seedLiquidationRecords() {
  const repo = AppDataSource.getRepository(LiquidationRecord);
  const rows: Partial<LiquidationRecord>[] = [];

  const myLiqs = [
    { loanId: '24', recovered: '1800000000000', writtenOff: '200000000000',  daysAgo_: 110 },
    { loanId: '31', recovered: '1100000000000', writtenOff: '0',             daysAgo_: 88  },
    { loanId: '35', recovered: '750000000000',  writtenOff: '50000000000',   daysAgo_: 52  },
    { loanId: '38', recovered: '2300000000000', writtenOff: '0',             daysAgo_: 30  },
    { loanId: '40', recovered: '3200000000000', writtenOff: '300000000000',  daysAgo_: 12  },
  ];
  for (let i = 0; i < myLiqs.length; i++) {
    const l = myLiqs[i];
    rows.push({
      loanId: l.loanId, borrower: MY_WALLET,
      recoveredAmount: l.recovered, writtenOffAmount: l.writtenOff,
      txHash: fakeTx(5000 + i),
      blockNumber: (18_000_000 + Number(l.loanId) * 5000).toString(),
      liquidatedAt: daysAgo(l.daysAgo_),
    });
  }

  const mockLiqs = [
    { loanId: '128', borrower: fakeWallet(11), recovered: '1800000000000', writtenOff: '0',              daysAgo_: 19 },
    { loanId: '121', borrower: fakeWallet(13), recovered: '2200000000000', writtenOff: '0',              daysAgo_: 35 },
    { loanId: '118', borrower: fakeWallet(14), recovered: '1240000000000', writtenOff: '460000000000',   daysAgo_: 44 },
    { loanId: '116', borrower: fakeWallet(15), recovered: '800000000000',  writtenOff: '0',              daysAgo_: 52 },
    { loanId: '114', borrower: fakeWallet(16), recovered: '880000000000',  writtenOff: '1020000000000',  daysAgo_: 60 },
    { loanId: '111', borrower: fakeWallet(17), recovered: '880000000000',  writtenOff: '220000000000',   daysAgo_: 70 },
    { loanId: '107', borrower: fakeWallet(18), recovered: '1000000000000', writtenOff: '0',              daysAgo_: 85 },
  ];
  for (const l of mockLiqs) {
    rows.push({
      loanId: l.loanId, borrower: l.borrower,
      recoveredAmount: l.recovered, writtenOffAmount: l.writtenOff,
      txHash: fakeTx(Number(l.loanId)),
      blockNumber: (18_000_000 + Number(l.loanId) * 5000).toString(),
      liquidatedAt: daysAgo(l.daysAgo_),
    });
  }

  for (let i = 0; i < 88; i++) {
    const principal   = rnd(500, 5_000) * 1_000_000_000;
    const recoveryPct = rnd(40, 100) / 100;
    const recovered   = Math.round(principal * recoveryPct);
    rows.push({
      loanId: (300 + i).toString(),
      borrower: fakeWallet(50 + i),
      recoveredAmount: recovered.toString(),
      writtenOffAmount: (principal - recovered).toString(),
      txHash: fakeTx(300 + i),
      blockNumber: (17_500_000 + rnd(0, 500_000)).toString(),
      liquidatedAt: daysAgo(rnd(1, 180)),
    });
  }

  await repo.save(rows as LiquidationRecord[]);
  console.log(`  ✔ liquidation_records   ${rows.length} rows`);
}

// ─── 6. Score history ─────────────────────────────────────────────────────────
async function seedScoreHistory() {
  const repo = AppDataSource.getRepository(ScoreHistory);
  const rows: Partial<ScoreHistory>[] = [];

  const myHistory = [
    { score: 595, prev: 590, tier: 'Gold', source: 'on_chain',    daysAgo_: 55, block: '18188092' },
    { score: 597, prev: 595, tier: 'Gold', source: 'on_chain',    daysAgo_: 52, block: '18207314' },
    { score: 611, prev: 597, tier: 'Gold', source: 'attestation', daysAgo_: 49, block: '18207314' },
    { score: 612, prev: 611, tier: 'Gold', source: 'on_chain',    daysAgo_: 46, block: '18234556' },
    { score: 620, prev: 612, tier: 'Gold', source: 'on_chain',    daysAgo_: 43, block: '18263778' },
    { score: 622, prev: 620, tier: 'Gold', source: 'on_chain',    daysAgo_: 40, block: '18288016' },
    { score: 640, prev: 622, tier: 'Gold', source: 'on_chain',    daysAgo_: 37, block: '18312478' },
    { score: 646, prev: 640, tier: 'Gold', source: 'attestation', daysAgo_: 34, block: '18330081' },
    { score: 596, prev: 646, tier: 'Gold', source: 'on_chain',    daysAgo_: 31, block: '18361218' },
    { score: 614, prev: 596, tier: 'Gold', source: 'on_chain',    daysAgo_: 28, block: '18389344' },
    { score: 626, prev: 614, tier: 'Gold', source: 'on_chain',    daysAgo_: 25, block: '18417682' },
    { score: 628, prev: 626, tier: 'Gold', source: 'on_chain',    daysAgo_: 22, block: '18445118' },
    { score: 650, prev: 628, tier: 'Gold', source: 'on_chain',    daysAgo_: 19, block: '18472481' },
    { score: 648, prev: 650, tier: 'Gold', source: 'decay',       daysAgo_: 16, block: '18499000' },
    { score: 650, prev: 648, tier: 'Gold', source: 'on_chain',    daysAgo_: 9,  block: '18526000' },
  ];

  for (const h of myHistory) {
    rows.push({
      wallet: MY_WALLET, score: h.score, previousScore: h.prev,
      tier: h.tier, source: h.source,
      txHash: fakeTx(h.score * 100), blockNumber: h.block,
      recordedAt: daysAgo(h.daysAgo_),
    });
  }

  for (let i = 0; i < 85; i++) {
    const score = rnd(50, 950);
    rows.push({
      wallet: fakeWallet(i + 1), score, previousScore: score - rnd(-30, 30),
      tier: tierFromScore(score), source: pick(['on_chain', 'attestation', 'decay']),
      txHash: fakeTx(1000 + i),
      blockNumber: (17_000_000 + rnd(0, 1_000_000)).toString(),
      recordedAt: daysAgo(rnd(1, 180)),
    });
  }

  await repo.save(rows as ScoreHistory[]);
  console.log(`  ✔ score_history         ${rows.length} rows`);
}

// ─── 7. Score events ──────────────────────────────────────────────────────────
async function seedScoreEvents() {
  const repo = AppDataSource.getRepository(ScoreEvent);
  const rows: Partial<ScoreEvent>[] = [];

  const myEvents: any[] = [
    { signalType: 'ON_TIME_REPAYMENT',       sub: 'On-time repayment',    source: 'Loan #38',           sourceType: 'Repayment',      delta: 22,  scoreAfter: 650, daysAgo_: 9,  block: '18472481', txSeed: 101 },
    { signalType: 'DAO_VOTE',                sub: 'DAO vote',             source: 'Snapshot prop #47',  sourceType: 'Governance',     delta: 2,   scoreAfter: 628, daysAgo_: 12, block: '18445118', txSeed: 102 },
    { signalType: 'CROSS_PROTOCOL_REPAYMENT',sub: 'Cross-protocol repay', source: 'EAS · Aave V3',      sourceType: 'Cross-protocol', delta: 12,  scoreAfter: 626, daysAgo_: 15, block: '18417682', txSeed: 103,
      attestationUid: '0xcc7a08e2456b000000000000000000000000000000000000000000000000045b',
      attestationPayload: { schema: 'bytes32 loanId, uint256 amount', attester: '0x9aE2_3F7C (AaveBridge)', recipient: MY_WALLET, revocable: false, quorum: 5, maxQuorum: 5, rawPayload: { protocol: 'Aave V3', amount: '12000000', chainId: 8453 } },
    },
    { signalType: 'ON_TIME_REPAYMENT',       sub: 'On-time repayment',    source: 'Loan #36',           sourceType: 'Repayment',      delta: 18,  scoreAfter: 614, daysAgo_: 18, block: '18389344', txSeed: 104 },
    { signalType: 'LATE_REPAYMENT',          sub: 'Late repayment',       source: 'Loan #31',           sourceType: 'Penalty',        delta: -50, scoreAfter: 596, daysAgo_: 21, block: '18361218', txSeed: 105,
      attestationUid: '0xcc7a08e245b00000000000000000000000000000000000000000000000000000',
      attestationPayload: { schema: 'bytes32 loanId, uint256 daysLate', attester: '0x9aE2_3F7C (LoanManager)', recipient: MY_WALLET, revocable: false, quorum: 5, maxQuorum: 5, rawPayload: { loanId: '0x31', daysLate: 3, graceUsed: true } },
    },
    { signalType: 'ATTESTATION_RECEIVED',    sub: 'Attestation received', source: 'Gitcoin Passport',   sourceType: 'Identity',       delta: 6,   scoreAfter: 646, daysAgo_: 24, block: '18330081', txSeed: 106 },
    { signalType: 'ON_TIME_REPAYMENT',       sub: 'On-time repayment',    source: 'Loan #31',           sourceType: 'Repayment',      delta: 18,  scoreAfter: 640, daysAgo_: 27, block: '18312478', txSeed: 107 },
    { signalType: 'DAO_VOTE',                sub: 'DAO vote',             source: 'Snapshot prop #45',  sourceType: 'Governance',     delta: 2,   scoreAfter: 622, daysAgo_: 30, block: '18288016', txSeed: 108 },
    { signalType: 'PARTIAL_REPAYMENT',       sub: 'Partial repayment',    source: 'Loan #29',           sourceType: 'Repayment',      delta: 8,   scoreAfter: 620, daysAgo_: 33, block: '18263778', txSeed: 109 },
    { signalType: 'WALLET_AGE',              sub: 'Wallet age',           source: 'auto · Decay sentinel', sourceType: 'Passive',     delta: 1,   scoreAfter: 612, daysAgo_: 36, block: '18234556', txSeed: 110 },
    { signalType: 'KYC_VERIFIED',            sub: 'KYC verified',         source: 'Sumsub',             sourceType: 'Identity',       delta: 14,  scoreAfter: 611, daysAgo_: 39, block: '18207314', txSeed: 111 },
    { signalType: 'DECAY',                   sub: 'Inactivity decay',     source: 'auto · Inactivity',  sourceType: 'Passive',        delta: -4,  scoreAfter: 597, daysAgo_: 42, block: '18188092', txSeed: 112 },
  ];

  for (const e of myEvents) {
    rows.push({
      wallet: MY_WALLET, signalType: e.signalType, signalSub: e.sub,
      source: e.source, sourceType: e.sourceType,
      delta: e.delta, scoreAfter: e.scoreAfter,
      txHash: fakeTx(e.txSeed), blockNumber: e.block,
      attestationUid: e.attestationUid ?? null,
      attestationPayload: e.attestationPayload ?? null,
      occurredAt: daysAgo(e.daysAgo_),
    });
  }

  const signalTypes = [
    { type: 'ON_TIME_REPAYMENT',        sub: 'On-time repayment',    sourceType: 'Repayment',      deltaRange: [8, 25]   as [number,number] },
    { type: 'PARTIAL_REPAYMENT',        sub: 'Partial repayment',    sourceType: 'Repayment',      deltaRange: [3, 10]   as [number,number] },
    { type: 'LATE_REPAYMENT',           sub: 'Late repayment',       sourceType: 'Penalty',        deltaRange: [-60, -20]as [number,number] },
    { type: 'DAO_VOTE',                 sub: 'DAO vote',             sourceType: 'Governance',     deltaRange: [1, 4]    as [number,number] },
    { type: 'CROSS_PROTOCOL_REPAYMENT', sub: 'Cross-protocol repay', sourceType: 'Cross-protocol', deltaRange: [5, 15]   as [number,number] },
    { type: 'ATTESTATION_RECEIVED',     sub: 'Attestation received', sourceType: 'Identity',       deltaRange: [4, 10]   as [number,number] },
    { type: 'WALLET_AGE',               sub: 'Wallet age',           sourceType: 'Passive',        deltaRange: [1, 2]    as [number,number] },
    { type: 'KYC_VERIFIED',             sub: 'KYC verified',         sourceType: 'Identity',       deltaRange: [10, 20]  as [number,number] },
    { type: 'DECAY',                    sub: 'Inactivity decay',     sourceType: 'Passive',        deltaRange: [-8, -2]  as [number,number] },
  ];

  for (let i = 0; i < 88; i++) {
    const sig   = pick(signalTypes);
    const [lo, hi] = sig.deltaRange;
    rows.push({
      wallet: fakeWallet(i + 1), signalType: sig.type, signalSub: sig.sub,
      source: `Loan #${rnd(1, 500)}`, sourceType: sig.sourceType,
      delta: rnd(lo, hi), scoreAfter: rnd(100, 900),
      txHash: fakeTx(500 + i),
      blockNumber: (17_000_000 + rnd(0, 1_000_000)).toString(),
      occurredAt: daysAgo(rnd(1, 180)),
    });
  }

  await repo.save(rows as ScoreEvent[]);
  console.log(`  ✔ score_events          ${rows.length} rows`);
}

// ─── 8. LP positions ──────────────────────────────────────────────────────────
async function seedLpPositions() {
  const repo = AppDataSource.getRepository(LpPosition);
  const rows: Partial<LpPosition>[] = [];

  const myDeposited  = 10_000;
  const mySharePrice = 1.04762;
  const myShares     = myDeposited / mySharePrice;
  const myValue      = myShares * mySharePrice;
  rows.push({
    wallet: MY_WALLET,
    usdcDeposited: myDeposited.toFixed(2), shares: myShares.toFixed(8),
    sharePrice: mySharePrice.toFixed(8), currentValue: myValue.toFixed(2),
    interestEarned: (myValue - myDeposited).toFixed(2),
    poolShareBps: 20, apyBps: 476,
  });

  for (let i = 1; i < 100; i++) {
    const deposited  = rnd(500, 500_000);
    const sharePrice = 1 + Math.random() * 0.08;
    const shares     = deposited / sharePrice;
    const value      = shares * sharePrice;
    rows.push({
      wallet: fakeWallet(i),
      usdcDeposited: deposited.toFixed(2), shares: shares.toFixed(8),
      sharePrice: sharePrice.toFixed(8), currentValue: value.toFixed(2),
      interestEarned: (value - deposited).toFixed(2),
      poolShareBps: Math.round((deposited / 50_000_000) * 10_000), apyBps: rnd(350, 600),
    });
  }

  await repo.save(rows as LpPosition[]);
  console.log(`  ✔ lp_positions          ${rows.length} rows`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
