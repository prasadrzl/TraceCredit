import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttestationService } from './attestation.service';
import { AttestationController } from './attestation.controller';
import { GraphModule } from '../graph/graph.module';
import { ScoreHistory } from '../database/entities/score-history.entity';

@Module({
  imports: [GraphModule, TypeOrmModule.forFeature([ScoreHistory])],
  providers: [AttestationService],
  controllers: [AttestationController],
  exports: [AttestationService],
})
export class AttestationModule {}
