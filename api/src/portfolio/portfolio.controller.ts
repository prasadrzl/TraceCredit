import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get(':wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Full portfolio snapshot — score, loans, LP position, activity (DB-backed)' })
  @ApiOkResponse({ description: 'Aggregated portfolio data from borrower_profiles, loan_snapshots, lp_positions, score_events' })
  @ApiNotFoundResponse({ description: 'No data found for this wallet' })
  async getPortfolio(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.portfolioService.getPortfolio(wallet);
  }
}
