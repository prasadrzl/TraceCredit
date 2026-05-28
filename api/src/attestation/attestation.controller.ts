import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AttestationService } from './attestation.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { BridgeConfigDto, AttestationHistoryItemDto } from './attestation.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

@ApiTags('Attestation')
@ApiExtraModels(BridgeConfigDto, AttestationHistoryItemDto)
@Controller('attestation')
export class AttestationController {
  constructor(private readonly attestationService: AttestationService) {}

  @Get('config')
  @ApiOperation({ summary: 'AttestationBridge quorum config (M-of-N threshold + window)' })
  @ApiOkResponse({
    type: BridgeConfigDto,
    description: 'Current AttestationBridge contract address, required quorum, and signing window',
  })
  async getConfig() {
    return this.attestationService.getBridgeConfig();
  }

  @Get(':wallet/history')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get attestation-driven score update history for a wallet' })
  @ApiOkResponse({
    type: AttestationHistoryItemDto,
    isArray: true,
    description: 'Chronological list of on-chain attestation events for the wallet',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'No attestation history found for this wallet' })
  async getHistory(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.attestationService.getAttestationHistory(wallet);
  }
}
