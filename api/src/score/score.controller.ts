import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ScoreService } from './score.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { WalletScoreDto, ScoreHistoryItemDto } from './score.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

@ApiTags('Score')
@ApiExtraModels(WalletScoreDto, ScoreHistoryItemDto)
@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get(':wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get on-chain reputation score + tier for a wallet' })
  @ApiOkResponse({
    type: WalletScoreDto,
    description: 'Current score, tier, SBT status, freeze/blacklist flags, credit limit, and interest rate',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'Wallet has no score record on-chain' })
  async getScore(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.scoreService.getWalletScore(wallet);
  }

  @Get(':wallet/history')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get score update history from subgraph' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of history items to return (1–200, default 50)',
    example: 50,
  })
  @ApiOkResponse({
    type: ScoreHistoryItemDto,
    isArray: true,
    description: 'Score change events ordered from most recent to oldest',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address or limit out of range' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'No score history found for this wallet' })
  async getHistory(
    @Param('wallet', ParseAddressPipe) wallet: `0x${string}`,
    @Query() query: HistoryQueryDto,
  ) {
    return this.scoreService.getScoreHistory(wallet, query.limit);
  }

  @Get(':wallet/db-history')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get score update history from database (dev/seed data)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({ isArray: true, description: 'Score history rows from the score_history table' })
  async getDbHistory(
    @Param('wallet', ParseAddressPipe) wallet: `0x${string}`,
    @Query() query: HistoryQueryDto,
  ) {
    return this.scoreService.getDbScoreHistory(wallet, query.limit);
  }

  @Get(':wallet/profile')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get borrower profile from database (score, tier, credit limit)' })
  @ApiOkResponse({ description: 'Borrower profile row from the borrower_profiles table' })
  @ApiNotFoundResponse({ description: 'No profile found for this wallet' })
  async getProfile(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    const profile = await this.scoreService.getBorrowerProfile(wallet);
    if (!profile) throw new NotFoundException(`No profile found for ${wallet}`);
    return profile;
  }

  @Get(':wallet/events')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get score events from database (signal history with EAS data)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({ isArray: true, description: 'Score events from the score_events table' })
  async getEvents(
    @Param('wallet', ParseAddressPipe) wallet: `0x${string}`,
    @Query() query: HistoryQueryDto,
  ) {
    return this.scoreService.getScoreEvents(wallet, query.limit);
  }
}
