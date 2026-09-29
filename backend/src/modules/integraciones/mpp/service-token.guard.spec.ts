import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceTokenGuard } from './service-token.guard';

const TOKEN = 'q7Vx2mP9rT4wZ8kL1nB6yC3hF5jD0sA2eG7uI9oR';

const config = (value: string | undefined) =>
  ({ get: () => value }) as unknown as ConfigService;

const contextWith = (headers: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard(config(TOKEN));

  it('allows the request when the header matches', () => {
    expect(guard.canActivate(contextWith({ 'x-api-key': TOKEN }))).toBe(true);
  });

  it('rejects when the header is missing', () => {
    expect(() => guard.canActivate(contextWith({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong token of the same length', () => {
    const wrong = TOKEN.slice(0, -1) + (TOKEN.endsWith('R') ? 'X' : 'R');
    expect(() =>
      guard.canActivate(contextWith({ 'x-api-key': wrong })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a token of different length', () => {
    expect(() =>
      guard.canActivate(contextWith({ 'x-api-key': `${TOKEN}extra` })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a repeated header (array value)', () => {
    expect(() =>
      guard.canActivate(contextWith({ 'x-api-key': [TOKEN, TOKEN] })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects every request when the integration is disabled', () => {
    const disabled = new ServiceTokenGuard(config(undefined));
    expect(() =>
      disabled.canActivate(contextWith({ 'x-api-key': '' })),
    ).toThrow(UnauthorizedException);
    expect(() =>
      disabled.canActivate(contextWith({ 'x-api-key': TOKEN })),
    ).toThrow(UnauthorizedException);
  });
});
