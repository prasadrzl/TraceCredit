import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ChainHealthIndicator } from './chain.health';
import { HealthCheckResultDto } from './health.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

@ApiTags('Health')
@ApiExtraModels(HealthCheckResultDto)
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly chain: ChainHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness / readiness probe' })
  @ApiOkResponse({
    type: HealthCheckResultDto,
    description: 'All health indicators are up — service is healthy',
  })
  @ApiServiceUnavailableResponse({
    type: ApiErrorResponse,
    description: 'One or more health indicators are down (database, chain RPC, or memory heap)',
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.chain.isHealthy('chain'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
