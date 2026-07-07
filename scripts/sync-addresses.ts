#!/usr/bin/env ts-node
/**
 * sync-addresses.ts
 *
 * Reads the Foundry broadcast artifact after `forge script --broadcast` and
 * writes every proxy address into api/.env.development and web/.env.local,
 * replacing existing values in-place (all other vars are untouched).
 *
 * Usage:
 *   npm run sync-addresses              # chain 11155420 (Optimism Sepolia)
 *   npm run sync-addresses:dry          # print without writing
 *   node scripts/sync-addresses.js --chain 1  # mainnet broadcast
 */

import fs from 'fs';
import path from 'path';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const chainId = args.includes('--chain') ? args[args.indexOf('--chain') + 1] : '11155420';
const dryRun  = args.includes('--dry-run');

// ─── Paths ───────────────────────────────────────────────────────────────────

const ROOT      = path.join(__dirname, '..');
const BROADCAST = path.join(ROOT, `contracts/broadcast/Deploy.s.sol/${chainId}/run-latest.json`);
const API_ENV   = path.join(ROOT, 'api/.env.development');
const WEB_ENV   = path.join(ROOT, 'web/.env.local');

// ─── Mappings ────────────────────────────────────────────────────────────────

// impl contract name (from broadcast) → API env var name (proxy address)
const CONTRACT_TO_API_ENV: Record<string, string> = {
  LendingPool:           'LENDING_POOL_ADDRESS',
  ReputationSBT:         'REPUTATION_SBT_ADDRESS',
  InterestAccrualEngine: 'INTEREST_ACCRUAL_ENGINE_ADDRESS',
  ScoreEngine:           'SCORE_ENGINE_ADDRESS',
  ReserveModule:         'RESERVE_MODULE_ADDRESS',
  CreditLineManager:     'CREDIT_LINE_MANAGER_ADDRESS',
  FeeCollector:          'FEE_COLLECTOR_ADDRESS',
  LiquidationManager:    'LIQUIDATION_MANAGER_ADDRESS',
  WhitelistRegistry:     'WHITELIST_REGISTRY_ADDRESS',
  RateLimiter:           'RATE_LIMITER_ADDRESS',
  SBTStakeVault:         'SBT_STAKE_VAULT_ADDRESS',
  AttestationBridge:     'ATTESTATION_BRIDGE_ADDRESS',
  MockUSDC:              'USDC_ADDRESS',  // direct deploy, no proxy
};

// subset that also lives in the web env under NEXT_PUBLIC_ prefix
const API_TO_WEB_ENV: Record<string, string> = {
  LENDING_POOL_ADDRESS:        'NEXT_PUBLIC_LENDING_POOL_ADDRESS',
  REPUTATION_SBT_ADDRESS:      'NEXT_PUBLIC_REPUTATION_SBT_ADDRESS',
  SCORE_ENGINE_ADDRESS:        'NEXT_PUBLIC_SCORE_ENGINE_ADDRESS',
  CREDIT_LINE_MANAGER_ADDRESS: 'NEXT_PUBLIC_CREDIT_LINE_MANAGER_ADDRESS',
  LIQUIDATION_MANAGER_ADDRESS: 'NEXT_PUBLIC_LIQUIDATION_MANAGER_ADDRESS',
  RESERVE_MODULE_ADDRESS:      'NEXT_PUBLIC_RESERVE_MODULE_ADDRESS',
  FEE_COLLECTOR_ADDRESS:       'NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS',
  RATE_LIMITER_ADDRESS:        'NEXT_PUBLIC_RATE_LIMITER_ADDRESS',
  USDC_ADDRESS:                'NEXT_PUBLIC_USDC_ADDRESS',
};

// ─── Broadcast types ─────────────────────────────────────────────────────────

interface BroadcastTx {
  contractName?: string;
  contractAddress?: string;
}

interface BroadcastFile {
  transactions: BroadcastTx[];
}

// ─── Parse broadcast ─────────────────────────────────────────────────────────

function parseAddresses(): Record<string, string> {
  if (!fs.existsSync(BROADCAST)) {
    console.error(`Broadcast file not found:\n  ${BROADCAST}`);
    console.error('Run `forge script script/Deploy.s.sol --broadcast ...` first.');
    process.exit(1);
  }

  const { transactions } = JSON.parse(fs.readFileSync(BROADCAST, 'utf8')) as BroadcastFile;
  const result: Record<string, string> = {};

  for (let i = 0; i < transactions.length; i++) {
    const { contractName, contractAddress } = transactions[i];
    if (!contractName || !contractAddress) continue;

    const apiKey = CONTRACT_TO_API_ENV[contractName];
    if (!apiKey) continue;

    if (contractName === 'MockUSDC') {
      // No proxy — use the implementation address directly
      result[apiKey] = contractAddress;
    } else {
      // Next tx is the ERC1967Proxy deployed for this implementation
      const next = transactions[i + 1];
      if (next?.contractName === 'ERC1967Proxy' && next?.contractAddress) {
        result[apiKey] = next.contractAddress;
      }
    }
  }

  return result;
}

// ─── Env file patcher ────────────────────────────────────────────────────────

function patchEnvFile(filePath: string, updates: Record<string, string>): number {
  if (!fs.existsSync(filePath)) {
    console.warn(`  (skipped — file not found: ${filePath})`);
    return 0;
  }

  let content    = fs.readFileSync(filePath, 'utf8');
  let patchCount = 0;

  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^(${key}=).*$`, 'm');
    if (!re.test(content)) continue;  // var not present in this file — skip
    content = content.replace(re, `$1${value}`);
    patchCount++;
  }

  if (!dryRun) fs.writeFileSync(filePath, content, 'utf8');
  return patchCount;
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log(`\nReading broadcast: ${BROADCAST}\n`);
const apiAddresses = parseAddresses();

const pad = Math.max(...Object.keys(apiAddresses).map((k) => k.length));
for (const [key, val] of Object.entries(apiAddresses)) {
  console.log(`  ${key.padEnd(pad)}  ${val}`);
}

const webAddresses: Record<string, string> = {};
for (const [apiKey, val] of Object.entries(apiAddresses)) {
  const webKey = API_TO_WEB_ENV[apiKey];
  if (webKey) webAddresses[webKey] = val;
}

const label = dryRun ? '[dry-run] would update' : 'Updating';

console.log(`\n${label} ${API_ENV}`);
console.log(`  ${patchEnvFile(API_ENV, apiAddresses)} variable(s) updated`);

console.log(`${label} ${WEB_ENV}`);
console.log(`  ${patchEnvFile(WEB_ENV, webAddresses)} variable(s) updated`);

if (dryRun) {
  console.log('\n(dry-run — no files written)');
} else {
  console.log('\nDone. Restart the API and web dev server to pick up the new addresses.');
}
