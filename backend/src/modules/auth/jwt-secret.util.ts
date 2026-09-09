import { ConfigService } from '@nestjs/config';

/**
 * Resolves JWT_SECRET from env. Throws at boot if missing or the weak default "secret".
 */
export function resolveJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET')?.trim();
  if (!secret || secret === 'secret') {
    throw new Error(
      'JWT_SECRET is required and must not be the weak default "secret". Set a strong value in backend/.env (see .env.example).',
    );
  }
  return secret;
}
