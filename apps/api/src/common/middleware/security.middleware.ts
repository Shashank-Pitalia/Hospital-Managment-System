import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Security Headers Assertion (FR-SEC-09)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 2. Issue CSRF token on GET request if missing
    let csrfToken = req.headers['x-csrf-token'] as string;
    if (!csrfToken) {
      csrfToken = `csrf-${Date.now()}-sec-token`;
    }
    res.setHeader('X-CSRF-Token', csrfToken);

    // 3. Validate CSRF Token on mutating requests (FR-SEC-08)
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase());
    const fullUrl = req.originalUrl || req.url || req.path || '';
    const isAuthLogin = fullUrl.includes('/auth/login');
    const isCsrfFetch = fullUrl.includes('/auth/csrf-token');

    if (isMutating && !isAuthLogin && !isCsrfFetch) {
      const headerCsrf = req.headers['x-csrf-token'];
      if (!headerCsrf) {
        // Fallback check: Allow if Authorization header present
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          throw new ForbiddenException('CSRF Token missing on state-changing request (FR-SEC-08).');
        }
      }
    }

    next();
  }
}
