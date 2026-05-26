import { ApiProperty } from '@nestjs/swagger';

export class HealthIndicatorResultDto {
  @ApiProperty({ type: String, example: 'up', enum: ['up', 'down'] })
  status: string;
}

export class HealthCheckResultDto {
  @ApiProperty({ type: String, example: 'ok', enum: ['ok', 'error', 'shutting_down'] })
  status: string;

  @ApiProperty({
    type: Object,
    example: { database: { status: 'up' }, chain: { status: 'up' }, memory_heap: { status: 'up' } },
    description: 'Per-indicator health results',
  })
  info: Record<string, HealthIndicatorResultDto>;

  @ApiProperty({
    type: Object,
    example: {},
    description: 'Per-indicator error details (populated when status is "error")',
  })
  error: Record<string, HealthIndicatorResultDto>;

  @ApiProperty({
    type: Object,
    example: { database: { status: 'up' }, chain: { status: 'up' }, memory_heap: { status: 'up' } },
    description: 'Union of info and error results',
  })
  details: Record<string, HealthIndicatorResultDto>;
}
