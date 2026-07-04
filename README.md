# TraceCredit — Reputation-Based Undercollateralized Lending Protocol

A full-stack DeFi lending protocol on **Optimism Sepolia** where borrowers access undercollateralized USDC loans based on on-chain reputation scores stored in **ERC-5192 Soulbound Tokens**. Lenders deposit into an **ERC-4626 vault** and earn yield from borrower interest.

---

## Screenshots

|                                                  Reputation                                                   |                                                  Loan Score                                                   |
| :-----------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------: |
| <img alt="Dashboard" src="https://github.com/user-attachments/assets/932e4531-7f76-4c5c-bcb0-a96eaab4956b" /> | <img alt="Portfolio" src="https://github.com/user-attachments/assets/90dd56d3-5242-4184-920e-849cb858cd81" /> |

|                                                   Portfolio                                                    |                                                  Dashboard                                                  |
| :------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------: |
| <img alt="Reputation" src="https://github.com/user-attachments/assets/e9d83a13-69f2-40e9-8456-3da70c9695a7" /> | <img alt="History" src="https://github.com/user-attachments/assets/36c08258-da74-468e-ae7b-c22b2176a7ad" /> |

---

## Architecture Overview

![Architecture](image.png)

---

## Repository Structure

```
tracecredit/
├── contracts/          Smart contracts (Solidity · Foundry)
├── api/                Backend API (NestJS · TypeScript)
├── web/                Frontend (Next.js 14 · wagmi · viem)
├── package.json        Monorepo root (npm workspaces)
└── README.md
```

---

## Smart Contracts

**Network:** Optimism Sepolia (Chain ID: 11155420)  
**Toolchain:** Foundry · OpenZeppelin Upgradeable · Solidity 0.8.24  
**Pattern:** UUPS upgradeable proxies — all 14 contracts deployed as ERC1967 proxies

### Contract Architecture

```
contracts/src/
├── core/
│   ├── LendingPool.sol            ERC-4626 vault · 5-state loan FSM · 15% reserve factor
│   ├── ScoreEngine.sol            0-1000 score · 9+ signals · log gain curve · decay
│   └── ReputationSBT.sol          ERC-5192 soulbound token · 50 USDC stake · blacklist
├── modules/
│   ├── CreditLineManager.sol      Per-wallet limits · tier lockups (14–90 days)
│   ├── InterestAccrualEngine.sol  Stateless kink-model interest math (pure/view)
│   ├── LiquidationManager.sol     Keeper flow · score penalty · credit freeze · write-off
│   ├── SBTStakeVault.sol          USDC stake custody · 30-day unlock delay
│   ├── RateLimiter.sol            24-hour rolling borrow limits per tier
│   ├── FeeCollector.sol           Protocol fee routing
│   └── EmergencyPause.sol         Circuit breaker
├── oracle/
│   └── AttestationBridge.sol      M-of-N quorum (min 2) · 1-hour window · off-chain signals
├── mocks/
│   └── MockUSDC.sol               Mintable ERC20 (6 decimals) — testnet only
└── base/
    ├── ProtocolBase.sol            GOVERNOR_ROLE · GUARDIAN_ROLE · AccessControl
    └── VaultBase.sol               ERC-4626 base (tcUSDC shares)
```

### Tier System

| Tier     | Score Range | Credit Limit | Interest APY | Lockup  |
| -------- | ----------- | ------------ | ------------ | ------- |
| Bronze   | 0 – 249     | $0           | 18%          | 90 days |
| Silver   | 250 – 499   | $500         | 18%          | 90 days |
| Gold     | 500 – 699   | $5,000       | 14%          | 60 days |
| Platinum | 700 – 899   | $25,000      | 10%          | 30 days |
| Diamond  | 900 – 1000  | $100,000     | 7%           | 14 days |

### Score Signals

| Signal                | Delta                                |
| --------------------- | ------------------------------------ |
| On-time repayment     | +40 pts                              |
| Cross-protocol signal | +30 pts                              |
| Wallet age            | +20 pts                              |
| SBT staking           | +15 pts                              |
| DAO governance vote   | +10 pts                              |
| Late repayment        | −50 pts                              |
| Default / liquidation | −200 pts                             |
| Inactivity decay      | −1 pt / 30 days (after 90-day grace) |

### Deploy

```bash
cd contracts
cp .env.example .env          # fill in DEPLOYER_PRIVATE_KEY, TREASURY_ADDRESS, etc.
source .env

# Run tests first
forge test

# Deploy to Optimism Sepolia (auto-deploys MockUSDC if USDC_ADDRESS is unset)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $OP_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $OPSCAN_API_KEY \
  -vvvv
```

Required env vars: `DEPLOYER_PRIVATE_KEY`, `TREASURY_ADDRESS`, `KEEPER_ADDRESS`, `ATTESTOR_ADDRESS`, `ATTESTOR_ADDRESS_2`, `QUORUM` (min 2), `OP_SEPOLIA_RPC_URL`, `OPSCAN_API_KEY`.  
Leave `USDC_ADDRESS` unset to auto-deploy `MockUSDC` (testnet convenience).

### Running Tests

```bash
cd contracts
forge test                                   # all tests
forge test --match-contract LendingPool      # specific contract
forge coverage                               # coverage report
```

---

## Backend API

**Stack:** NestJS v10 · TypeScript · PostgreSQL · Redis · Socket.io  
**Port:** 3001  
**Swagger:** `http://localhost:3001/docs`

All API responses are wrapped in a standard envelope:
```json
{ "success": true, "data": { ... }, "timestamp": "2026-07-04T00:00:00.000Z" }
```
The frontend Axios client auto-unwraps this — consumers always receive `data` directly.

### Module Structure

```
api/src/
├── score/          GET /:wallet/profile · /events · /db-history
├── credit/         GET /:wallet/line · /rate-limit
├── positions/      GET /:wallet · /loan/:id · /snapshots/:wallet
├── vault/          GET /stats · /shares/:wallet
├── yield/          GET /apy · /pending/:wallet
├── pool/           GET /health · /recent-borrows · /recent-liquidations · /at-risk
├── price/          GET /usdc · /usdc/history
├── attestation/    GET /config · /:wallet/history
├── liquidation/    GET / · /stats · /:wallet
├── analytics/      GET /protocol · /volume
├── portfolio/      GET /:wallet  (aggregated — Redis 60s TTL)
├── gateway/        WebSocket — Socket.io namespace /ws
├── indexer/        One-shot getLogs catch-up on startup (INDEXER_ENABLED flag)
├── database/       TypeORM · entities · migrations
└── cache/          Redis cache-manager
```

### Caching

| Endpoint / Method         | Cache   | TTL  |
| ------------------------- | ------- | ---- |
| `GET /pool/health`        | Redis   | 30s  |
| `GET /pool/recent-borrows`| Redis   | 30s  |
| `GET /pool/at-risk`       | Redis   | 30s  |
| `GET /portfolio/:wallet`  | Redis   | 60s  |
| `GET /vault/shares/:wallet`| Redis  | 30s  |
| `GET /yield/pending/:wallet`| Redis | 30s  |
| `isSubgraphHealthy()`     | In-memory | 15s |

### Rate Limiting

120 requests per 60 seconds per IP via NestJS `ThrottlerGuard`.

### Database Entities

| Entity             | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| BorrowerProfile    | Wallet score, tier, credit limits, SBT state   |
| LoanSnapshot       | Loan state (active / repaid / defaulted)       |
| ScoreEvent         | Per-signal event log with attestation payload  |
| ScoreHistory       | Score change history with source tracking      |
| LiquidationRecord  | Recovery amounts, write-off, tx hash           |
| IndexerCheckpoint  | Last processed block per event stream          |
| PoolStat           | Utilisation, APY, TVL snapshots                |
| PriceSnapshot      | USDC/USD price history (fallback: $1.00)       |

### WebSocket Events

```
Namespace: /ws

Server → Client:
  loan:created       new borrow confirmed on-chain
  loan:repaid        repayment confirmed
  loan:defaulted     loan entered default
  loan:liquidated    position liquidated by keeper
  score:updated      reputation score changed
  circuit:breaker    protocol pause triggered

Client → Server:
  subscribe:wallet   { wallet: '0x...' }   join wallet room
  unsubscribe:wallet { wallet: '0x...' }   leave wallet room
```

### Liquidation Keeper Bot

Controlled by `KEEPER_ENABLED=true/false` in `.env.development`.

```
Every 60 seconds:
  ↓ getOverdueLoans() — subgraph first, Postgres fallback
  ↓ LiquidationManager.batchLiquidate(loanIds[])
  ↓ ScoreEngine penalty applied on-chain (−200 pts)
  ↓ CreditLineManager credit freeze (12 months)
  ↓ ReserveModule absorbs unrecoverable debt
  ↓ LoanLiquidated event emitted → WS push to borrower
```

Circuit breaker pauses the bot after 3 consecutive failures and emits a `circuit:breaker` WS event.

### Event Indexer

Controlled by `INDEXER_ENABLED=true/false` in `.env.development` (default `false` to preserve Alchemy quota).

When enabled, on API startup it replays `getLogs` from block 0 across 4 streams:

| Stream | Event |
| ------ | ----- |
| `lendingPool:LoanCreated` | `LoanCreated(loanId, borrower, principal, rateBps, dueTime)` |
| `lendingPool:LoanRepaid` | `LoanRepaid(loanId, borrower, amount, fully)` |
| `liquidationManager:LoanLiquidated` | `LoanLiquidated(loanId, borrower, recovered, writtenOff)` |
| `reputationSbt:ScoreUpdated` | `ScoreUpdated(wallet, previousScore, newScore, tier)` |

### Setup

```bash
cd api
cp .env.example .env.development    # fill in DB, Redis, RPC, contract addresses
npm install
npm run start:dev                   # starts on port 3001
npm run seed:dev                    # seed mock data for development
```

Key env vars:

```bash
KEEPER_ENABLED=true                 # enable liquidation bot
INDEXER_ENABLED=false               # set true to replay getLogs on startup
RPC_URL=https://opt-sepolia.g.alchemy.com/v2/<key>
CHAIN_ID=11155420
LENDING_POOL_ADDRESS=0xccd89d...
LIQUIDATION_BOT_PRIVATE_KEY=0x...   # must hold KEEPER_ROLE on LiquidationManager
```

---

## Blockchain Indexing (The Graph)

Subgraph indexes events from `LendingPool`, `LiquidationManager`, and `ReputationSBT`.

### Indexed Entities

```
Loans        → created, repaid, defaulted, liquidated
ScoreUpdates → signal type, delta, score after
Liquidations → recovered amount, written-off, keeper tx
Borrowers    → cumulative borrow/repay totals
```

The API checks subgraph health on every query. If the subgraph is more than **50 blocks** behind the chain head, it automatically falls back to Postgres (indexed events) or direct RPC reads.

---

## Frontend

**Stack:** Next.js 14 (App Router) · wagmi v2 · viem v2 · RainbowKit · TanStack React Query v5  
**Port:** 3000  
**Supported chains:** Optimism Sepolia (primary) · Optimism · Base · Arbitrum

### Pages

| Page          | Route           | Description                                         |
| ------------- | --------------- | --------------------------------------------------- |
| Dashboard     | `/`             | TVL, utilisation, live activity feed, WebSocket     |
| Borrow        | `/borrow`       | Score panel, credit bar, borrow form, active loans  |
| Lend          | `/lend`         | LP position, deposit/withdraw, APY breakdown        |
| Portfolio     | `/portfolio`    | Net worth, health cards, borrow + LP positions      |
| Reputation    | `/reputation`   | SBT card, score arc, signals, attestations, decay   |
| Markets       | `/markets`      | Volume chart, borrows table, score distribution     |
| Liquidations  | `/liquidations` | Liquidation table, recovery panel, keeper status    |
| History       | `/history`      | Loan history table + individual loan detail         |
| Score History | `/score-history`| Score trend chart, signal breakdown, event table    |
| Onboarding    | `/onboarding`   | Connect wallet → stake USDC → mint SBT              |

### Write Operations

All on-chain writes use `use-protocol-write.ts` which implements the full flow:

```
1. Check USDC allowance  →  approve() if needed  (signing → confirming)
2. simulateContract()    →  catch reverts before signing
3. writeContract()       →  sign transaction     (signing → submitted)
4. waitForTransactionReceipt()                   (submitted → confirming → success)
```

| Hook              | Contract Call               | Approve needed |
| ----------------- | --------------------------- | -------------- |
| `useBorrowWrite`  | `LendingPool.borrow()`      | No             |
| `useRepayWrite`   | `LendingPool.repay()`       | Yes (USDC)     |
| `useDepositWrite` | `LendingPool.deposit()`     | Yes (USDC)     |
| `useRedeemWrite`  | `LendingPool.redeem()`      | No             |

### Notifications

Real-time toast notifications are delivered via WebSocket (`SocketProvider`). Each notification also invalidates the relevant React Query cache keys so the UI refreshes automatically.

| Event              | Toast                                          |
| ------------------ | ---------------------------------------------- |
| `loan:created`     | "Loan funded · $X USDC drawn"                  |
| `loan:repaid`      | "Loan repaid · Credit restored"                |
| `loan:defaulted`   | "Loan defaulted" (destructive)                 |
| `loan:liquidated`  | "Position liquidated · $X recovered"           |
| `score:updated`    | "Score: 420 → 445 (+25 pts) · Tier: Silver"   |
| `circuit:breaker`  | Contract name + reason (destructive)           |

### Block Explorer URLs

`lib/wagmi/explorer.ts` builds chain-aware explorer URLs so tx links in the success modal always point to the right network:

| Chain              | Explorer                              |
| ------------------ | ------------------------------------- |
| Optimism Sepolia   | sepolia-optimism.etherscan.io         |
| Optimism           | optimistic.etherscan.io               |
| Base               | basescan.org                          |
| Arbitrum           | arbiscan.io                           |

### Data Flow

```
Component
    ↓
Hook (hooks/use-*.ts)
    ↓  React Query useQuery
Data layer (lib/data/*.ts)
    ↓  Axios — auto-unwraps { success, data, timestamp } envelope
apiClient (lib/api/client.ts) → NestJS API (port 3001)
    ↓  on failure
Mock fallback (lib/mock/*.json)
```

### State Management

| Store            | Holds                                        |
| ---------------- | -------------------------------------------- |
| `tx-modal-store` | Active tx modal state machine (5 states)     |
| `activity-store` | Live feed items (max 50) from WebSocket      |
| `wallet-store`   | Connected wallet address and chain ID        |

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=11155420
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract addresses — fill in after deploying (see contracts/script/Deploy.s.sol)
NEXT_PUBLIC_LENDING_POOL_ADDRESS=
NEXT_PUBLIC_REPUTATION_SBT_ADDRESS=
NEXT_PUBLIC_SCORE_ENGINE_ADDRESS=
NEXT_PUBLIC_CREDIT_LINE_MANAGER_ADDRESS=
NEXT_PUBLIC_LIQUIDATION_MANAGER_ADDRESS=
NEXT_PUBLIC_RESERVE_MODULE_ADDRESS=
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=
NEXT_PUBLIC_RATE_LIMITER_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
```

### Setup

```bash
cd web
cp .env.local.example .env.local    # or copy values from above
npm install
npm run dev                          # starts on port 3000
```

---

## Full Stack Setup

### Prerequisites

```
Node.js 18+
PostgreSQL 14+
Redis 7+
Foundry (contracts only)
```

### Start Order

```bash
# 1. Start PostgreSQL and Redis

# 2. Start API
cd api && npm run start:dev

# 3. Seed development data (optional)
npm run seed:dev

# 4. Start frontend
cd web && npm run dev

# 5. Open browser
open http://localhost:3000        # Frontend
open http://localhost:3001/docs   # Swagger API docs
```

### Monorepo Scripts (from root)

```bash
npm run dev:api         # start NestJS API
npm run dev:web         # start Next.js frontend
npm run build           # build all workspaces
npm run test:api        # run NestJS tests
npm run lint            # lint all workspaces
```

---

## Tech Stack

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Contracts  | Solidity 0.8.24 · Foundry · OpenZeppelin · ERC-4626 · ERC-5192  |
| Network    | Optimism Sepolia (Chain ID: 11155420)                           |
| Indexing   | The Graph Protocol · GraphQL · RPC getLogs fallback             |
| Backend    | NestJS · TypeScript · TypeORM · PostgreSQL                      |
| Cache      | Redis · in-memory (subgraph health)                             |
| Real-time  | Socket.io WebSocket gateway                                     |
| Frontend   | Next.js 14 · React 18 · TypeScript · Tailwind CSS               |
| Blockchain | wagmi v2 · viem v2 · RainbowKit                                 |
| State      | TanStack React Query v5 · Zustand                               |
| UI         | shadcn/ui · Radix UI · Recharts · Lucide                        |
| Wallets    | MetaMask · WalletConnect · Coinbase Wallet                      |

---

## License

MIT
