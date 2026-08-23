import { Injectable, UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AppointmentStatus, Role } from '@prisma/client';
import { WsJwtGuard } from './ws-jwt.guard';

interface AppointmentEvent {
  type: 'created' | 'status_changed';
  appointmentId: string;
  doctorId: string;
  patientId: string;
  status: AppointmentStatus;
}

/**
 * One room per hospital ("hospital:<id>"). A client joins their own
 * hospital's room only — join_hospital reads the target from the
 * verified JWT payload attached by WsJwtGuard, not from client input,
 * so a socket can't join another tenant's room by just asking.
 * SUPER_ADMIN is exempt, mirroring TenantGuard on the REST side.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'realtime' })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_hospital')
  handleJoinHospital(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (user.role !== Role.SUPER_ADMIN && !user.hospitalId) {
      return { error: 'No hospital associated with this account' };
    }
    const room = user.role === Role.SUPER_ADMIN ? null : `hospital:${user.hospitalId}`;
    if (room) client.join(room);
    return { joined: room ?? 'super_admin:no_room' };
  }

  emitAppointmentEvent(hospitalId: string, event: AppointmentEvent) {
    this.server?.to(`hospital:${hospitalId}`).emit('appointment_event', event);
  }
}
