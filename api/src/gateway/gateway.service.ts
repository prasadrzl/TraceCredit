import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AppLogger } from '../logger/logger.service';

export const WS_EVENT_LOAN_DEFAULTED = 'loan:defaulted';
export const WS_EVENT_LOAN_LIQUIDATED = 'loan:liquidated';
export const WS_EVENT_SCORE_UPDATED = 'score:updated';
export const WS_EVENT_CIRCUIT_BREAKER = 'circuit:breaker';
export const WS_EVENT_LOAN_CREATED = 'loan:created';
export const WS_EVENT_LOAN_REPAID = 'loan:repaid';

export interface LoanDefaultedPayload {
  loanId: string;
  borrower: string;
  principal: string;
  timestamp: number;
}

export interface LoanLiquidatedPayload {
  loanId: string;
  borrower: string;
  recoveredAmount: string;
  txHash: string;
  timestamp: number;
}

export interface ScoreUpdatedPayload {
  wallet: string;
  newScore: number;
  previousScore: number;
  tier: string;
  timestamp: number;
}

export interface CircuitBreakerPayload {
  contract: string;
  event: string;
  details: string;
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class ProtocolGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients = 0;

  constructor(private readonly logger: AppLogger) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket gateway initialised', 'ProtocolGateway');
  }

  handleConnection(client: Socket): void {
    this.connectedClients++;
    this.logger.log(
      `Client connected: ${client.id} | Total: ${this.connectedClients}`,
      'ProtocolGateway',
    );
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients--;
    this.logger.log(
      `Client disconnected: ${client.id} | Total: ${this.connectedClients}`,
      'ProtocolGateway',
    );
  }

  @SubscribeMessage('subscribe:wallet')
  handleSubscribeWallet(
    @MessageBody() data: { wallet: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `wallet:${data.wallet.toLowerCase()}`;
    client.join(room);
    this.logger.debug(`${client.id} joined room ${room}`, 'ProtocolGateway');
  }

  @SubscribeMessage('unsubscribe:wallet')
  handleUnsubscribeWallet(
    @MessageBody() data: { wallet: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `wallet:${data.wallet.toLowerCase()}`;
    client.leave(room);
  }

  emitLoanDefaulted(payload: LoanDefaultedPayload): void {
    this.server.emit(WS_EVENT_LOAN_DEFAULTED, payload);
    this.server
      .to(`wallet:${payload.borrower.toLowerCase()}`)
      .emit(WS_EVENT_LOAN_DEFAULTED, payload);
    this.logger.warn(
      `Loan defaulted: ${payload.loanId} borrower=${payload.borrower}`,
      'ProtocolGateway',
    );
  }

  emitLoanLiquidated(payload: LoanLiquidatedPayload): void {
    this.server.emit(WS_EVENT_LOAN_LIQUIDATED, payload);
    this.server
      .to(`wallet:${payload.borrower.toLowerCase()}`)
      .emit(WS_EVENT_LOAN_LIQUIDATED, payload);
    this.logger.warn(
      `Loan liquidated: ${payload.loanId} tx=${payload.txHash}`,
      'ProtocolGateway',
    );
  }

  emitScoreUpdated(payload: ScoreUpdatedPayload): void {
    this.server.emit(WS_EVENT_SCORE_UPDATED, payload);
    this.server
      .to(`wallet:${payload.wallet.toLowerCase()}`)
      .emit(WS_EVENT_SCORE_UPDATED, payload);
  }

  emitCircuitBreaker(payload: CircuitBreakerPayload): void {
    this.server.emit(WS_EVENT_CIRCUIT_BREAKER, payload);
    this.logger.error(
      `Circuit breaker: ${payload.contract} → ${payload.event}: ${payload.details}`,
      undefined,
      'ProtocolGateway',
    );
  }

  emitLoanCreated(payload: { loanId: string; borrower: string; principal: string; timestamp: number }): void {
    this.server.emit(WS_EVENT_LOAN_CREATED, payload);
    this.server
      .to(`wallet:${payload.borrower.toLowerCase()}`)
      .emit(WS_EVENT_LOAN_CREATED, payload);
  }

  emitLoanRepaid(payload: { loanId: string; borrower: string; amount: string; fully: boolean; timestamp: number }): void {
    this.server.emit(WS_EVENT_LOAN_REPAID, payload);
    this.server
      .to(`wallet:${payload.borrower.toLowerCase()}`)
      .emit(WS_EVENT_LOAN_REPAID, payload);
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }
}
