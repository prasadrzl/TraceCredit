import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';
import { LoanSnapshot } from '../database/entities/loan-snapshot.entity';
import { LpPosition } from '../database/entities/lp-position.entity';
import { ScoreEvent } from '../database/entities/score-event.entity';
import { ScoreHistory } from '../database/entities/score-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowerProfile, LoanSnapshot, LpPosition, ScoreEvent, ScoreHistory])],
  providers: [PortfolioService],
  controllers: [PortfolioController],
})
export class PortfolioModule {}
