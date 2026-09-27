import { ConfigService } from '@nestjs/config';
import {
  JWT_SECRET_MIN_LENGTH_PROD,
  resolveJwtSecret,
} from './jwt-secret.util';

const config = (value: string | undefined) =>
  ({ get: () => value }) as unknown as ConfigService;

const DEV_SECRET = 'super_secret_key_random_string';
const STRONG_SECRET = 'q7Vx2mP9rT4wZ8kL1nB6yC3hF5jD0sA2eG7uI9oR';

describe('resolveJwtSecret', () => {
  describe('NODE_ENV=production', () => {
    it('rejects the documented development secret', () => {
      expect(() => resolveJwtSecret(config(DEV_SECRET), 'production')).toThrow(
        /development value/,
      );
    });

    it.each([['secret'], [''], ['   '], [undefined]])('rejects %p', (value) => {
      expect(() => resolveJwtSecret(config(value), 'production')).toThrow(
        /JWT_SECRET/,
      );
    });

    it('rejects secrets shorter than the minimum length', () => {
      const short = 'a'.repeat(JWT_SECRET_MIN_LENGTH_PROD - 1);
      expect(() => resolveJwtSecret(config(short), 'production')).toThrow(
        /at least 32/,
      );
    });

    it('accepts a strong secret of at least 32 characters', () => {
      expect(
        resolveJwtSecret(config(`  ${STRONG_SECRET}  `), 'production'),
      ).toBe(STRONG_SECRET);
    });

    it('does not leak the secret value in the error message', () => {
      const short = 'my-leaky-short-secret';
      let message = '';
      try {
        resolveJwtSecret(config(short), 'production');
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toMatch(/JWT_SECRET/);
      expect(message).not.toContain(short);
    });
  });

  describe.each(['development', undefined])('NODE_ENV=%p', (nodeEnv) => {
    it('accepts the documented development secret', () => {
      expect(resolveJwtSecret(config(DEV_SECRET), nodeEnv)).toBe(DEV_SECRET);
    });

    it.each([['secret'], [''], [undefined]])('still rejects %p', (value) => {
      expect(() => resolveJwtSecret(config(value), nodeEnv)).toThrow(
        /JWT_SECRET/,
      );
    });
  });
});
