import { Module } from '@nestjs/common';
import { ProtocolGateway } from './gateway.service';
import { GatewayController } from './gateway.controller';

@Module({
  providers: [ProtocolGateway],
  controllers: [GatewayController],
  exports: [ProtocolGateway],
})
export class GatewayModule {}
