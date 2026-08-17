import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

@Injectable()
export class ThrottleMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitStore>();
  private limit = 100; // requests per window
  private window = 60000; // 1 minute window

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getClientKey(req);
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Create or reset record
      this.store.set(key, {
        count: 1,
        resetTime: now + this.window,
      });
      return next();
    }

    if (record.count >= this.limit) {
      throw new ForbiddenException('Too many requests, please try again later');
    }

    record.count++;
    next();
  }

  private getClientKey(req: Request): string {
    // Use IP address as key
    return req.ip || 'unknown';
  }
}
