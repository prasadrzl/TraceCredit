import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { PoolStat } from '../database/entities/pool-stat.entity';
import { LpPosition } from '../database/entities/lp-position.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PoolStat, LpPosition])],
  providers: [VaultService],
  controllers: [VaultController],
  exports: [VaultService],
})
export class VaultModule {}
