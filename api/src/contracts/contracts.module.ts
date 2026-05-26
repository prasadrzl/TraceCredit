import { Module, Global } from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Global()
@Module({
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
