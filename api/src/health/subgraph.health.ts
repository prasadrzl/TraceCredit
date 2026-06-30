import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { IndexerService } from '../indexer/indexer.service';

@Injectable()
export class SubgraphHealthIndicator extends HealthIndicator {
  constructor(private readonly indexer: IndexerService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const healthy = await this.indexer.isSubgraphHealthy();
    if (!healthy) {
      throw new HealthCheckError(
        'Subgraph lagging or unreachable',
        this.getStatus(key, false, { error: 'Subgraph is more than 50 blocks behind or unreachable' }),
      );
    }
    return this.getStatus(key, true);
  }
}
