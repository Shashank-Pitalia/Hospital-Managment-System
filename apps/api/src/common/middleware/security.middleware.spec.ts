import { SecurityMiddleware } from './security.middleware';

describe('SecurityMiddleware (Phase 15 — Security Hardening)', () => {
  let middleware: SecurityMiddleware;

  beforeEach(() => {
    middleware = new SecurityMiddleware();
  });

  it('should set HSTS, CSP, X-Frame-Options, and X-Content-Type-Options headers on response (FR-SEC-09)', () => {
    const req: any = { method: 'GET', path: '/api/patients/lookup', headers: {} };
    const headers: Record<string, string> = {};
    const res: any = {
      setHeader: (key: string, val: string) => {
        headers[key] = val;
      },
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-CSRF-Token']).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
