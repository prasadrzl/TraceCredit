import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ContractAddresses {
  lendingPool: `0x${string}`;
  reputationSbt: `0x${string}`;
  scoreEngine: `0x${string}`;
  creditLineManager: `0x${string}`;
  liquidationManager: `0x${string}`;
  attestationBridge: `0x${string}`;
  whitelistRegistry: `0x${string}`;
  reserveModule: `0x${string}`;
  feeCollector: `0x${string}`;
  sbtStakeVault: `0x${string}`;
  rateLimiter: `0x${string}`;
  interestAccrualEngine: `0x${string}`;
  usdc: `0x${string}`;
  chainlinkUsdcUsd: `0x${string}`;
}

@Injectable()
export class ContractsService {
  private readonly addresses: ContractAddresses;

  constructor(private readonly config: ConfigService) {
    this.addresses = {
      lendingPool: config.get<string>('contracts.lendingPool') as `0x${string}`,
      reputationSbt: config.get<string>('contracts.reputationSbt') as `0x${string}`,
      scoreEngine: config.get<string>('contracts.scoreEngine') as `0x${string}`,
      creditLineManager: config.get<string>('contracts.creditLineManager') as `0x${string}`,
      liquidationManager: config.get<string>('contracts.liquidationManager') as `0x${string}`,
      attestationBridge: config.get<string>('contracts.attestationBridge') as `0x${string}`,
      whitelistRegistry: config.get<string>('contracts.whitelistRegistry') as `0x${string}`,
      reserveModule: config.get<string>('contracts.reserveModule') as `0x${string}`,
      feeCollector: config.get<string>('contracts.feeCollector') as `0x${string}`,
      sbtStakeVault: config.get<string>('contracts.sbtStakeVault') as `0x${string}`,
      rateLimiter: config.get<string>('contracts.rateLimiter') as `0x${string}`,
      interestAccrualEngine: config.get<string>('contracts.interestAccrualEngine') as `0x${string}`,
      usdc: config.get<string>('contracts.usdc') as `0x${string}`,
      chainlinkUsdcUsd: config.get<string>('contracts.chainlinkUsdcUsd') as `0x${string}`,
    };
  }

  get addr(): ContractAddresses {
    return this.addresses;
  }
}
