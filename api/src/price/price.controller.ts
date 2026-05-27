import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PriceService } from './price.service';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PriceDto } from './price.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class PriceHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

@ApiTags('Price')
@ApiExtraModels(PriceDto)
@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('usdc')
  @ApiOperation({ summary: 'Get current USDC/USD price from Chainlink' })
  @ApiOkResponse({
    type: PriceDto,
    description: 'Latest Chainlink USDC/USD price round — raw 8-decimal value and human-readable float',
  })
  async getUsdcPrice() {
    return this.priceService.getUsdcPrice();
  }

  @Get('usdc/history')
  @ApiOperation({ summary: 'Get USDC price history snapshots' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of historical price snapshots to return (1–1000, default 100)',
    example: 100,
  })
  @ApiOkResponse({
    type: PriceDto,
    isArray: true,
    description: 'Price history snapshots ordered from most recent to oldest',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'limit parameter is out of range or not an integer' })
  async getPriceHistory(@Query() query: PriceHistoryQueryDto) {
    return this.priceService.getPriceHistory(query.limit);
  }
}
