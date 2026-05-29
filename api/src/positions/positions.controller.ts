import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { ParseAddressPipe } from '../common/pipes/parse-address.pipe';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { LoanDto, BorrowerPositionsDto } from './positions.dto';
import { ApiErrorResponse } from '../common/dto/api-response.dto';

@ApiTags('Positions')
@ApiExtraModels(LoanDto, BorrowerPositionsDto)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get(':wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get all loan positions (active + historical) for a borrower' })
  @ApiOkResponse({
    type: BorrowerPositionsDto,
    description: 'Active and historical loan positions for the wallet, plus cumulative totals',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Invalid Ethereum address' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'No positions found for this wallet' })
  async getBorrowerPositions(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.positionsService.getBorrowerPositions(wallet);
  }

  @Get('loan/:loanId')
  @ApiParam({
    name: 'loanId',
    type: String,
    description: 'On-chain loan ID (numeric string, e.g. "42")',
    example: '42',
  })
  @ApiOperation({ summary: 'Get detailed loan info by loan ID' })
  @ApiOkResponse({
    type: LoanDto,
    description: 'Full loan details including state, accrued interest, and repayment progress',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'loanId is not a valid integer string' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'Loan with the given ID does not exist' })
  async getLoanDetail(@Param('loanId') loanId: string) {
    return this.positionsService.getLoanDetail(BigInt(loanId));
  }

  @Get('snapshots/:wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get loan snapshots from database for a borrower (dev/seed data)' })
  @ApiOkResponse({ isArray: true, description: 'Loan snapshot rows from the loan_snapshots table' })
  async getLoanSnapshots(@Param('wallet', ParseAddressPipe) wallet: `0x${string}`) {
    return this.positionsService.getLoanSnapshotsByBorrower(wallet);
  }
}
