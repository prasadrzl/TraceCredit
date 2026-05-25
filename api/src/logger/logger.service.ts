import { Injectable, LoggerService, Scope } from '@nestjs/common';
import pino from 'pino';

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      base: {
        service: 'tracecredit-api',
        env: process.env.NODE_ENV,
      },
    });
  }

  log(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.info({ context, ...this.mergeMeta(meta) }, message);
  }

  error(message: string, trace?: string, context?: string, ...meta: unknown[]): void {
    this.logger.error({ context, trace, ...this.mergeMeta(meta) }, message);
  }

  warn(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.warn({ context, ...this.mergeMeta(meta) }, message);
  }

  debug(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.debug({ context, ...this.mergeMeta(meta) }, message);
  }

  verbose(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.trace({ context, ...this.mergeMeta(meta) }, message);
  }

  child(context: string): pino.Logger {
    return this.logger.child({ context });
  }

  private mergeMeta(meta: unknown[]): Record<string, unknown> {
    if (!meta.length) return {};
    if (meta.length === 1 && typeof meta[0] === 'object' && meta[0] !== null) {
      return meta[0] as Record<string, unknown>;
    }
    return { meta };
  }
}
