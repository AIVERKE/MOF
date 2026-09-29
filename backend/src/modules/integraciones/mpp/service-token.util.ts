import { ConfigService } from '@nestjs/config';

export const SERVICE_TOKEN_MIN_LENGTH_PROD = 32;

/**
 * Resolves MPP_SERVICE_TOKEN from env. Empty means the integration is disabled
 * (every request is rejected). In production a present token must be at least
 * SERVICE_TOKEN_MIN_LENGTH_PROD characters, otherwise boot fails.
 */
export function resolveServiceToken(
  configService: ConfigService,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string | null {
  const token = configService.get<string>('MPP_SERVICE_TOKEN')?.trim();
  if (!token) {
    return null;
  }

  if (
    nodeEnv === 'production' &&
    token.length < SERVICE_TOKEN_MIN_LENGTH_PROD
  ) {
    throw new Error(
      `MPP_SERVICE_TOKEN must be at least ${SERVICE_TOKEN_MIN_LENGTH_PROD} characters when NODE_ENV=production. Generate one with: openssl rand -base64 48`,
    );
  }

  return token;
}
