import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { PositionsRepository } from './positions.repository';
import { LoanSnapshot } from '../database/entities/loan-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanSnapshot])],
  providers: [PositionsService, PositionsRepository],
  controllers: [PositionsController],
  exports: [PositionsService],
})
export class PositionsModule {}
