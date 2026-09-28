import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();
  const secret = 'test-jwt-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  function createContext(authorization?: string) {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: { authorization },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
    return { context, request };
  }

  it('rejects requests without an authorization header', () => {
    const { context } = createContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects authorization headers that are not bearer tokens', () => {
    const { context } = createContext('Basic token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('verifies a bearer token and attaches its payload to the request', () => {
    const payload = { sub: 'user-1', role: 'ADMIN' };
    const token = sign(payload, secret);
    const { context, request } = createContext(`Bearer ${token}`);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toMatchObject(payload);
  });

  it('rejects tokens that fail signature verification', () => {
    const token = sign({ sub: 'user-1' }, 'different-secret');
    const { context } = createContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
