import { Module } from '@nestjs/common';
import { YieldService } from './yield.service';
import { YieldController } from './yield.controller';

@Module({
  providers: [YieldService],
  controllers: [YieldController],
  exports: [YieldService],
})
export class YieldModule {}
