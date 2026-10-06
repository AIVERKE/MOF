import { isSwaggerEnabled, resolveHelmetOptions } from './security.util';

describe('isSwaggerEnabled', () => {
  it('is disabled in production', () => {
    expect(isSwaggerEnabled('production')).toBe(false);
  });

  it.each(['development', 'test', undefined])(
    'is enabled when NODE_ENV=%p',
    (nodeEnv) => {
      expect(isSwaggerEnabled(nodeEnv)).toBe(true);
    },
  );
});

describe('resolveHelmetOptions', () => {
  it('keeps the default CSP in production', () => {
    expect(
      resolveHelmetOptions('production', undefined).contentSecurityPolicy,
    ).toBeUndefined();
  });

  it('disables CSP outside production so Swagger UI works', () => {
    expect(
      resolveHelmetOptions('development', undefined).contentSecurityPolicy,
    ).toBe(false);
  });

  it.each([undefined, '', 'false', '1'])(
    'disables HSTS when HSTS_ENABLED=%p',
    (raw) => {
      expect(resolveHelmetOptions('production', raw).hsts).toBe(false);
    },
  );

  it('enables HSTS when HSTS_ENABLED=true', () => {
    expect(resolveHelmetOptions('production', 'true').hsts).toEqual({
      maxAge: 15552000,
      includeSubDomains: false,
    });
  });
});
