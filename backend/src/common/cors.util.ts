/**
 * Parses CORS_ORIGIN (comma-separated). In production, rejects empty lists and "*".
 * Non-prod defaults to http://localhost:5173 when unset.
 */
export function resolveCorsOrigins(
  raw: string | undefined = process.env.CORS_ORIGIN,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isProd = nodeEnv === 'production';

  if (isProd) {
    if (origins.length === 0 || origins.includes('*')) {
      throw new Error(
        'CORS_ORIGIN must be a non-empty comma-separated list of origins in production and must not include "*". See backend/.env.example.',
      );
    }
    return origins;
  }

  if (origins.length === 0) {
    return ['http://localhost:5173'];
  }

  return origins;
}
