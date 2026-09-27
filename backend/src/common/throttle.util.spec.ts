import { resolveTrustProxy, throttleConfig } from './throttle.util';

describe('resolveTrustProxy', () => {
  it('defaults to 1 hop in production', () => {
    expect(resolveTrustProxy(undefined, 'production')).toBe(1);
  });

  it('defaults to disabled outside production', () => {
    expect(resolveTrustProxy(undefined, 'development')).toBe(0);
    expect(resolveTrustProxy('', undefined)).toBe(0);
  });

  it('accepts an explicit hop count', () => {
    expect(resolveTrustProxy('0', 'production')).toBe(0);
    expect(resolveTrustProxy(' 2 ', undefined)).toBe(2);
  });

  it.each(['true', '*', 'loopback', '127.0.0.1', '1,2', '-1', '1.5'])(
    'rejects %p so trust cannot be opened to any client',
    (raw) => {
      expect(() => resolveTrustProxy(raw, 'production')).toThrow(/TRUST_PROXY/);
    },
  );
});

describe('throttleConfig', () => {
  it('uses the ticket defaults when unset', () => {
    expect(throttleConfig({})).toEqual({
      ttlMs: 60_000,
      limit: 60,
      authTtlMs: 60_000,
      authLimit: 10,
    });
  });

  it('reads overrides and ignores invalid values', () => {
    expect(
      throttleConfig({
        THROTTLE_TTL_MS: '30000',
        THROTTLE_LIMIT: 'abc',
        THROTTLE_AUTH_TTL_MS: '0',
        THROTTLE_AUTH_LIMIT: '5',
      }),
    ).toEqual({ ttlMs: 30_000, limit: 60, authTtlMs: 60_000, authLimit: 5 });
  });
});
