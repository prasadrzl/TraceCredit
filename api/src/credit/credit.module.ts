import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowerProfile])],
  providers: [CreditService],
  controllers: [CreditController],
  exports: [CreditService],
})
export class CreditModule {}
