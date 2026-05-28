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
import { AnchorService } from './anchor.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { IsOptional, IsString, Length } from 'class-validator';
import { ComplianceStatusDto } from './anchor.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

class ComplianceQueryDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string = 'US';
}

@ApiTags('Anchor / KYC')
@ApiExtraModels(ComplianceStatusDto)
@Controller('anchor')
export class AnchorController {
  constructor(private readonly anchorService: AnchorService) {}

  @Get(':wallet/compliance')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Check wallet compliance / KYC / sanctions status' })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'ISO 3166-1 alpha-2 country code used for geo-compliance screening',
    example: 'US',
  })
  @ApiOkResponse({
    type: ComplianceStatusDto,
    description: 'Compliance and geo-block status for the wallet',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address or country code' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'Wallet has no compliance record on file' })
  async getCompliance(
    @Param('wallet', ParseAddressPipe) wallet: `0x${string}`,
    @Query() query: ComplianceQueryDto,
  ) {
    return this.anchorService.getComplianceStatus(wallet, query.country ?? 'US');
  }
}
