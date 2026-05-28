import { Module } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { AttestationController } from './attestation.controller';

@Module({
  providers: [AttestationService],
  controllers: [AttestationController],
  exports: [AttestationService],
})
export class AttestationModule {}
