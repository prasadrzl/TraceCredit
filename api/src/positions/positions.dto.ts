import { ApiProperty } from '@nestjs/swagger';

export class LoanDto {
  @ApiProperty({
    type: String,
    example: '42',
    description: 'On-chain loan ID as string',
  })
  loanId: string;

  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM address of the borrower',
  })
  borrower: string;

  @ApiProperty({
    type: String,
    example: '1000000000',
    description: 'Original principal amount in USDC (6 decimals)',
  })
  principal: string;

  @ApiProperty({
    type: String,
    example: '1400',
    description: 'Annual interest rate in basis points',
  })
  interestRateBps: string;

  @ApiProperty({
    type: String,
    example: '19500000',
    description: 'Block number at which the loan was originated',
  })
  startBlock: string;

  @ApiProperty({
    type: Number,
    example: 1719000000,
    description: 'Unix timestamp (seconds) by which the loan must be repaid',
  })
  deadline: number;

  @ApiProperty({
    type: String,
    example: '500000000',
    description: 'Total amount repaid so far (USDC 6 decimals)',
  })
  repaid: string;

  @ApiProperty({
    type: String,
    example: '23000000',
    description: 'Accrued interest to date (USDC 6 decimals)',
  })
  accruedInterest: string;

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Numeric loan state: 0=Active, 1=GracePeriod, 2=Defaulted, 3=WrittenOff, 4=Repaid',
    minimum: 0,
    maximum: 4,
  })
  state: number;

  @ApiProperty({
    type: String,
    example: 'Active',
    enum: ['Active', 'GracePeriod', 'Defaulted', 'WrittenOff', 'Repaid'],
    description: 'Human-readable loan state label',
  })
  stateLabel: string;
}

export class BorrowerPositionsDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address',
  })
  wallet: string;

  @ApiProperty({ type: [LoanDto], description: 'Loans currently in Active or GracePeriod state' })
  activeLoans: LoanDto[];

  @ApiProperty({ type: [LoanDto], description: 'Loans in Repaid, Defaulted, or WrittenOff state' })
  historicalLoans: LoanDto[];

  @ApiProperty({
    type: String,
    example: '3000000000',
    description: 'Cumulative principal borrowed across all loans (USDC 6 decimals)',
  })
  totalBorrowed: string;

  @ApiProperty({
    type: String,
    example: '2000000000',
    description: 'Cumulative amount repaid across all loans (USDC 6 decimals)',
  })
  totalRepaid: string;
}
