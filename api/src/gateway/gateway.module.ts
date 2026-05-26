import { Module } from '@nestjs/common';
import { ProtocolGateway } from './gateway.service';

@Module({
  providers: [ProtocolGateway],
  exports: [ProtocolGateway],
})
export class GatewayModule {}
