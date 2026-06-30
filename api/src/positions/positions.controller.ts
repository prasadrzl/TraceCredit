import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
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
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiWalletParam } from '../common/decorators/api-wallet-param.decorator';
import { LoanDto, BorrowerPositionsDto, LoanSnapshotDto } from './positions.dto';
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
  async getLoanDetail(@Param('loanId', ParseBigIntPipe) loanId: bigint) {
    const loan = await this.positionsService.getLoanDetail(loanId);
    if (!loan.borrower) throw new NotFoundException(`Loan ${loanId} not found`);
    return loan;
  }

  @Get('snapshots/:wallet')
  @ApiWalletParam()
  @ApiOperation({ summary: 'Get loan snapshots from database for a borrower (dev/seed data)' })
  @ApiOkResponse({ isArray: true, description: 'Loan snapshot rows from the loan_snapshots table' })
  async getLoanSnapshots(
    @Param('wallet', ParseAddressPipe) wallet: `0x${string}`,
    @Query() pagination: PaginationDto,
  ) {
    const snaps = await this.positionsService.getLoanSnapshotsByBorrower(wallet, pagination.limit, pagination.skip);
    if (snaps.length === 0) throw new NotFoundException(`No loan snapshots found for ${wallet}`);
    return snaps.map((s): LoanSnapshotDto => ({
      loanId: s.loanId,
      borrower: s.borrower,
      principal: s.principal,
      accruedInterest: s.accruedInterest,
      dueAt: s.dueAt ?? '',
      status: s.status,
      rateBps: s.rateBps,
      blockNumber: s.blockNumber ?? '',
      createdAt: s.createdAt?.toISOString(),
    }));
  }
}
