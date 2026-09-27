/**
 * Límites de throttling para rutas sensibles de autenticación.
 * Leídos una vez al cargar el módulo (defaults del ticket de rate limit).
 */
export const AUTH_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 10),
    ttl: Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60_000),
  },
} as const;
