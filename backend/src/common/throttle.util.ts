/**
 * Parses TRUST_PROXY as a number of trusted proxy hops. Only non-negative
 * integers are accepted: "true", "*" or address lists would let a client that
 * reaches Nest directly spoof X-Forwarded-For and bypass the rate limit.
 * Defaults to 1 (Apache on the host) in production and 0 elsewhere.
 */
export function resolveTrustProxy(
  raw: string | undefined = process.env.TRUST_PROXY,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): number {
  const value = (raw ?? '').trim();
  if (value === '') {
    return nodeEnv === 'production' ? 1 : 0;
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(
      'TRUST_PROXY must be a non-negative integer (number of reverse proxy hops, e.g. 1 behind Apache). See backend/.env.example.',
    );
  }
  return Number(value);
}

export type ThrottleConfig = {
  ttlMs: number;
  limit: number;
  authTtlMs: number;
  authLimit: number;
};

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function throttleConfig(
  env: NodeJS.ProcessEnv = process.env,
): ThrottleConfig {
  return {
    ttlMs: positiveInt(env.THROTTLE_TTL_MS, 60_000),
    limit: positiveInt(env.THROTTLE_LIMIT, 60),
    authTtlMs: positiveInt(env.THROTTLE_AUTH_TTL_MS, 60_000),
    authLimit: positiveInt(env.THROTTLE_AUTH_LIMIT, 10),
  };
}
