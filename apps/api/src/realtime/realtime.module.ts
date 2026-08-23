import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { WsJwtGuard } from './ws-jwt.guard';

// Global so AppointmentsService (and later LabOrders/Invoices) can
// inject RealtimeGateway without every feature module importing this by hand.
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway, WsJwtGuard],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
