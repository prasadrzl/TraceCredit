import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ProtocolStatsDto, DailyVolumeDto } from './analytics.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class VolumeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}

@ApiTags('Analytics')
@ApiExtraModels(ProtocolStatsDto, DailyVolumeDto)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('protocol')
  @ApiOperation({ summary: 'Protocol-wide analytics: TVL, volume, utilisation, borrowers' })
  @ApiOkResponse({
    type: ProtocolStatsDto,
    description: 'Current protocol-wide statistics snapshot',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid query parameters' })
  async getProtocolStats() {
    return this.analyticsService.getProtocolAnalytics();
  }

  @Get('volume')
  @ApiOperation({ summary: 'Daily borrow/repay volume for the past N days' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (1–90, default 7)',
    example: 7,
  })
  @ApiOkResponse({
    type: DailyVolumeDto,
    isArray: true,
    description: 'Array of daily volume records ordered from oldest to most recent',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'days parameter is out of range or not an integer' })
  async getVolume(@Query() query: VolumeQueryDto) {
    return this.analyticsService.getVolumeStats(query.days);
  }
}
