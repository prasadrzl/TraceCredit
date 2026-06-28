import { Controller, Post, Body, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ProtocolGateway } from './gateway.service';

class EmitScoreDto {
  @IsString() wallet: string;
  @IsNumber() newScore: number;
  @IsNumber() previousScore: number;
  @IsString() tier: string;
}

class EmitLoanDto {
  @IsString() loanId: string;
  @IsString() borrower: string;
  @IsString() principal: string;
  @IsOptional() @IsString() txHash?: string;
  @IsOptional() @IsBoolean() fully?: boolean;
}

@ApiTags('Gateway')
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gateway: ProtocolGateway,
    private readonly config: ConfigService,
  ) {}

  private guardDev(): void {
    if (this.config.get<string>('nodeEnv') !== 'development') {
      throw new ForbiddenException('Dev-only endpoint');
    }
  }

  @Post('emit/score')
  @ApiOperation({ summary: '[Dev only] fire a score:updated event' })
  emitScore(@Body() dto: EmitScoreDto) {
    this.guardDev();
    this.gateway.emitScoreUpdated({ ...dto, timestamp: Date.now() });
    return { ok: true };
  }

  @Post('emit/loan-created')
  @ApiOperation({ summary: '[Dev only] fire a loan:created event' })
  emitLoanCreated(@Body() dto: EmitLoanDto) {
    this.guardDev();
    this.gateway.emitLoanCreated({ loanId: dto.loanId, borrower: dto.borrower, principal: dto.principal, timestamp: Date.now() });
    return { ok: true };
  }

  @Post('emit/loan-repaid')
  @ApiOperation({ summary: '[Dev only] fire a loan:repaid event' })
  emitLoanRepaid(@Body() dto: EmitLoanDto) {
    this.guardDev();
    this.gateway.emitLoanRepaid({ loanId: dto.loanId, borrower: dto.borrower, amount: dto.principal, fully: dto.fully ?? true, timestamp: Date.now() });
    return { ok: true };
  }

  @Post('emit/loan-liquidated')
  @ApiOperation({ summary: '[Dev only] fire a loan:liquidated event' })
  emitLoanLiquidated(@Body() dto: EmitLoanDto) {
    this.guardDev();
    this.gateway.emitLoanLiquidated({ loanId: dto.loanId, borrower: dto.borrower, recoveredAmount: dto.principal, txHash: dto.txHash ?? '0x0', timestamp: Date.now() });
    return { ok: true };
  }
}
