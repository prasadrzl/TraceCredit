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
import { CreditService } from './credit.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { CreditLineDto, RateLimitStatusDto } from './credit.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class RateLimitQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  tier?: number = 0;
}

@ApiTags('Credit')
@ApiExtraModels(CreditLineDto, RateLimitStatusDto)
@Controller('credit')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get(':wallet/line')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get credit line (limit, used, available) for a wallet' })
  @ApiOkResponse({
    type: CreditLineDto,
    description: 'Current credit line details: limit, used, available balance, freeze status, and interest rate',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'No credit line found for this wallet' })
  async getCreditLine(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.creditService.getCreditLine(wallet);
  }

  @Get(':wallet/rate-limit')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get daily rate-limit status for a wallet + tier' })
  @ApiQuery({
    name: 'tier',
    required: false,
    type: Number,
    description: 'Tier index: 0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond (default 0)',
    example: 3,
  })
  @ApiOkResponse({
    type: RateLimitStatusDto,
    description: 'Rolling 24-hour rate-limit window: daily cap, amount used, remaining, and reset time',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address or tier value out of range' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'No rate-limit record found for this wallet' })
  async getRateLimit(
    @Param('wallet', ParseAddressPipe) wallet: `0x${string}`,
    @Query() query: RateLimitQueryDto,
  ) {
    return this.creditService.getRateLimitStatus(wallet, query.tier ?? 0);
  }
}
