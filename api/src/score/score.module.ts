import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreService } from './score.service';
import { ScoreController } from './score.controller';
import { ScoreRepository } from './score.repository';
import { ScoreHistory } from '../database/entities/score-history.entity';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';
import { ScoreEvent } from '../database/entities/score-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScoreHistory, BorrowerProfile, ScoreEvent])],
  providers: [ScoreService, ScoreRepository],
  controllers: [ScoreController],
  exports: [ScoreService, ScoreRepository],
})
export class ScoreModule {}
