import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { LiquidationService } from './liquidation.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { LiquidationRecordDto, LiquidationStatsDto } from './liquidation.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class LiquidationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

@ApiTags('Liquidation')
@ApiExtraModels(LiquidationRecordDto, LiquidationStatsDto)
@Controller('liquidation')
export class LiquidationController {
  constructor(private readonly liquidationService: LiquidationService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent liquidation records' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of records to return (1–100, default 50)',
    example: 20,
  })
  @ApiOkResponse({
    type: LiquidationRecordDto,
    isArray: true,
    description: 'Most recent liquidation records ordered by liquidatedAt descending',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'limit parameter is out of range or not an integer' })
  async getRecent(@Query() query: LiquidationQueryDto) {
    return this.liquidationService.getRecentLiquidations(query.limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregated liquidation stats (count, recovered, written-off)' })
  @ApiOkResponse({
    type: LiquidationStatsDto,
    description: 'Protocol-wide liquidation totals and 24-hour count',
  })
  async getStats() {
    return this.liquidationService.getLiquidationStats();
  }

  @Get(':wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get liquidation history for a borrower' })
  @ApiOkResponse({
    type: LiquidationRecordDto,
    isArray: true,
    description: 'All liquidation records for the given borrower wallet',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'No liquidation history found for this wallet' })
  async getByBorrower(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.liquidationService.getLiquidationsByBorrower(wallet);
  }
}
