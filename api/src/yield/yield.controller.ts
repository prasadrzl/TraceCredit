import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { YieldService } from './yield.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { ApyStatsDto, PendingYieldDto } from './yield.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

@ApiTags('Yield')
@ApiExtraModels(ApyStatsDto, PendingYieldDto)
@Controller('yield')
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Get('apy')
  @ApiOperation({ summary: 'Get protocol gross + net LP APY from on-chain rate model' })
  @ApiOkResponse({
    type: ApyStatsDto,
    description: 'Current APY stats: utilisation, gross APY, net LP APY, and reserve factor',
  })
  async getApy() {
    return this.yieldService.getApyStats();
  }

  @Get('pending/:wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get estimated pending yield for an LP wallet' })
  @ApiOkResponse({
    type: PendingYieldDto,
    description: 'Estimated daily and annual USDC yield for the wallet based on current share balance and APY',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'Wallet holds no shares — no yield to estimate' })
  async getPendingYield(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.yieldService.getPendingYield(wallet);
  }
}
