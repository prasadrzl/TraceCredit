import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** Attaches a custom cache-control header so upstream CDNs respect TTL. */
@Injectable()
export class CacheTtlInterceptor implements NestInterceptor {
  constructor(private readonly ttlSeconds: number) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const res = _ctx.switchToHttp().getResponse();
        if (res?.setHeader) {
          res.setHeader('Cache-Control', `public, max-age=${this.ttlSeconds}`);
        }
      }),
    );
  }
}
