import { Module } from '@nestjs/common';
import { AnchorService } from './anchor.service';
import { AnchorController } from './anchor.controller';

@Module({
  providers: [AnchorService],
  controllers: [AnchorController],
  exports: [AnchorService],
})
export class AnchorModule {}
