import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { PriceSnapshot } from '../database/entities/price-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PriceSnapshot])],
  providers: [PriceService],
  controllers: [PriceController],
  exports: [PriceService],
})
export class PriceModule {}
