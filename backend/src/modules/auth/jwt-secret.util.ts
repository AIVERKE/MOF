import { ConfigService } from '@nestjs/config';

/** Valores publicados en el repo (README, docker-compose, .env.example). */
const DOCUMENTED_SECRETS = new Set([
  'secret',
  'super_secret_key_random_string',
]);

export const JWT_SECRET_MIN_LENGTH_PROD = 32;

const HOW_TO_GENERATE = 'Generate one with: openssl rand -base64 48';

/**
 * Resolves JWT_SECRET from env. Throws at boot if missing or the weak default "secret".
 * In production it also rejects the values documented in the repo and secrets
 * shorter than JWT_SECRET_MIN_LENGTH_PROD.
 */
export function resolveJwtSecret(
  configService: ConfigService,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const secret = configService.get<string>('JWT_SECRET')?.trim();
  if (!secret || secret === 'secret') {
    throw new Error(
      'JWT_SECRET is required and must not be the weak default "secret". Set a strong value in backend/.env (see .env.example).',
    );
  }

  if (nodeEnv === 'production') {
    if (DOCUMENTED_SECRETS.has(secret)) {
      throw new Error(
        `JWT_SECRET must not be the development value published in the repository when NODE_ENV=production. ${HOW_TO_GENERATE}`,
      );
    }
    if (secret.length < JWT_SECRET_MIN_LENGTH_PROD) {
      throw new Error(
        `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH_PROD} characters when NODE_ENV=production. ${HOW_TO_GENERATE}`,
      );
    }
  }

  return secret;
}
