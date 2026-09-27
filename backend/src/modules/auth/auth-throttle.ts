import { throttleConfig } from '../../common/throttle.util';

/**
 * Límites de throttling para rutas sensibles de autenticación.
 * Se resuelven por request: el decorador se evalúa al importar el módulo,
 * antes de que ConfigModule cargue el .env.
 */
export const AUTH_THROTTLE = {
  default: {
    limit: () => throttleConfig().authLimit,
    ttl: () => throttleConfig().authTtlMs,
  },
};
