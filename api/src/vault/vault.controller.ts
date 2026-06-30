import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { VaultService } from './vault.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { VaultStatsDto, SharesValueDto } from './vault.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

@ApiTags('Vault')
@ApiExtraModels(VaultStatsDto, SharesValueDto)
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get('stats')
  @ApiOperation({ summary: 'ERC-4626 pool stats: TVL, utilisation, share price, reserve' })
  @ApiOkResponse({
    type: VaultStatsDto,
    description: 'Current ERC-4626 vault metrics: TVL, outstanding loans, utilisation, share price, and reserves',
  })
  async getStats() {
    return this.vaultService.getVaultStats();
  }

  @Get('shares/:wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get LP share balance + USDC value for a wallet' })
  @ApiOkResponse({
    type: SharesValueDto,
    description: 'ERC-4626 share balance and current USDC redemption value for the wallet',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'Wallet holds no shares in the vault' })
  async getShares(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    const result = await this.vaultService.getSharesValue(wallet);
    if (result.shares === '0') throw new NotFoundException(`Wallet ${wallet} holds no shares in the vault`);
    return result;
  }
}
