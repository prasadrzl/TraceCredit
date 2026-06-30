import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const testKey = '__health_ping__';
      await this.cache.set(testKey, 'pong', 5000);
      const val = await this.cache.get(testKey);
      if (val !== 'pong') throw new Error('Cache round-trip mismatch');
      return this.getStatus(key, true);
    } catch (err: any) {
      throw new HealthCheckError('Redis unreachable', this.getStatus(key, false, { error: err?.message }));
    }
  }
}
