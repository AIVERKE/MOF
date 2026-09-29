import { ConfigService } from '@nestjs/config';
import {
  SERVICE_TOKEN_MIN_LENGTH_PROD,
  resolveServiceToken,
} from './service-token.util';

const config = (value: string | undefined) =>
  ({ get: () => value }) as unknown as ConfigService;

const STRONG_TOKEN = 'q7Vx2mP9rT4wZ8kL1nB6yC3hF5jD0sA2eG7uI9oR';

describe('resolveServiceToken', () => {
  it.each([[''], ['   '], [undefined]])(
    'returns null (integration disabled) for %p',
    (value) => {
      expect(resolveServiceToken(config(value), 'production')).toBeNull();
    },
  );

  it('rejects short tokens in production', () => {
    const short = 'a'.repeat(SERVICE_TOKEN_MIN_LENGTH_PROD - 1);
    expect(() => resolveServiceToken(config(short), 'production')).toThrow(
      /at least 32/,
    );
  });

  it('does not leak the token value in the error message', () => {
    const short = 'my-leaky-short-token';
    let message = '';
    try {
      resolveServiceToken(config(short), 'production');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/MPP_SERVICE_TOKEN/);
    expect(message).not.toContain(short);
  });

  it('accepts and trims a strong token in production', () => {
    expect(
      resolveServiceToken(config(`  ${STRONG_TOKEN}  `), 'production'),
    ).toBe(STRONG_TOKEN);
  });

  it('accepts short tokens outside production', () => {
    expect(resolveServiceToken(config('dev-token'), 'development')).toBe(
      'dev-token',
    );
  });
});
