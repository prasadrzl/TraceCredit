import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ChainService } from '../chain/chain.service';

@Injectable()
export class ChainHealthIndicator extends HealthIndicator {
  constructor(private readonly chainService: ChainService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const blockNumber = await this.chainService.getBlockNumber();
      return this.getStatus(key, true, { blockNumber: blockNumber.toString() });
    } catch (err: any) {
      throw new HealthCheckError('Chain RPC unreachable', this.getStatus(key, false, { error: err?.message }));
    }
  }
}
