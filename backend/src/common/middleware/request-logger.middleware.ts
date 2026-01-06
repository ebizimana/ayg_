import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

type ReqWithContext = Request & {
  requestId?: string;
  user?: { userId?: string; id?: string; email?: string };
};

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: ReqWithContext, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id']?.toString() || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const path = (req as any).originalUrl || req.url;
      const userId = req.user?.userId || req.user?.id || null;

      // Minimal structured log to stdout
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'request',
          requestId,
          method: req.method,
          path,
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(3)),
          userId,
        }),
      );
    });

    next();
  }
}
