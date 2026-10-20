import type { HelmetOptions } from 'helmet';

/**
 * Swagger UI and the OpenAPI document (/api, /api-json, /api-yaml) are only
 * published outside production.
 */
export function isSwaggerEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== 'production';
}

/**
 * HSTS is opt-in (HSTS_ENABLED=true): enable it only once the domain's HTTPS is stable.
 */
export function resolveHelmetOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  hstsRaw: string | undefined = process.env.HSTS_ENABLED,
): HelmetOptions {
  const isProd = nodeEnv === 'production';
  return {
    // Swagger UI (dev only) does not work under the default CSP.
    contentSecurityPolicy: isProd ? undefined : false,
    hsts:
      hstsRaw?.trim().toLowerCase() === 'true'
        ? { maxAge: 15552000, includeSubDomains: false }
        : false,
  };
}
