import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { ATTESTATION_BRIDGE_ABI } from '../contracts/abis';
import { GraphService } from '../graph/graph.service';

export interface BridgeConfig {
  requiredQuorum: number;
  quorumWindow: string;
}

export interface AttestationHistory {
  wallet: string;
  scoreUpdates: Array<{
    newScore: string;
    previousScore: string;
    txHash: string;
    blockNumber: string;
    timestamp: string;
  }>;
}

@Injectable()
export class AttestationService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly graph: GraphService,
  ) {}

  async getBridgeConfig(): Promise<BridgeConfig> {
    const cacheKey = 'attestation:config';
    const cached = await this.cache.get<BridgeConfig>(cacheKey);
    if (cached) return cached;

    const bridge = this.contracts.addr.attestationBridge;

    const [quorum, window] = await this.chain.publicClient.multicall({
      contracts: [
        { address: bridge, abi: ATTESTATION_BRIDGE_ABI, functionName: 'requiredQuorum' },
        { address: bridge, abi: ATTESTATION_BRIDGE_ABI, functionName: 'QUORUM_WINDOW' },
      ],
      allowFailure: false,
    });

    const result: BridgeConfig = {
      requiredQuorum: Number(quorum),
      quorumWindow: (window as bigint).toString(),
    };

    await this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  async getAttestationHistory(wallet: string): Promise<AttestationHistory> {
    const updates = await this.graph.getScoreHistory(wallet, 50);
    return {
      wallet,
      scoreUpdates: updates.map((u) => ({
        newScore: u.newScore,
        previousScore: u.previousScore,
        txHash: u.txHash,
        blockNumber: u.blockNumber,
        timestamp: u.timestamp,
      })),
    };
  }
}
