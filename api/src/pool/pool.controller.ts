import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PoolService } from './pool.service';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PoolOverviewDto, BorrowEventDto } from './pool.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class PoolEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  first?: number = 20;
}

@ApiTags('Pool')
@ApiExtraModels(PoolOverviewDto, BorrowEventDto)
@Controller('pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get('overview')
  @ApiOperation({ summary: 'LendingPool summary: TVL, utilisation, total deposited' })
  @ApiOkResponse({
    type: PoolOverviewDto,
    description: 'Current LendingPool summary including TVL, utilisation, and loan counts',
  })
  async getOverview() {
    return this.poolService.getOverview();
  }

  @Get('borrows')
  @ApiOperation({ summary: 'Recent borrow events from subgraph' })
  @ApiQuery({
    name: 'first',
    required: false,
    type: Number,
    description: 'Number of most recent borrow events to return (1–100, default 20)',
    example: 20,
  })
  @ApiOkResponse({
    type: BorrowEventDto,
    isArray: true,
    description: 'Most recent borrow events indexed by the subgraph',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'first parameter is out of range or not an integer' })
  async getRecentBorrows(@Query() query: PoolEventsQueryDto) {
    return this.poolService.getRecentBorrows(query.first);
  }

  @Get('liquidations')
  @ApiOperation({ summary: 'Recent liquidation events from subgraph' })
  @ApiQuery({
    name: 'first',
    required: false,
    type: Number,
    description: 'Number of most recent liquidation events to return (1–100, default 20)',
    example: 20,
  })
  @ApiOkResponse({
    type: BorrowEventDto,
    isArray: true,
    description: 'Most recent liquidation events indexed by the subgraph',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'first parameter is out of range or not an integer' })
  async getRecentLiquidations(@Query() query: PoolEventsQueryDto) {
    return this.poolService.getRecentLiquidations(query.first);
  }
}
