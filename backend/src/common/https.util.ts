import { readFileSync } from 'fs';

export type HttpsOptions = { key: Buffer; cert: Buffer };

/**
 * Builds Nest httpsOptions from HTTPS_KEY_PATH and HTTPS_CERT_PATH.
 * Both unset: plain HTTP (local dev or behind Apache). Only one set: error.
 * HTTPS_CERT_PATH must be the full chain (fullchain.pem), not cert.pem alone.
 */
export function resolveHttpsOptions(
  keyPath: string | undefined = process.env.HTTPS_KEY_PATH,
  certPath: string | undefined = process.env.HTTPS_CERT_PATH,
  readFile: (path: string) => Buffer = readFileSync,
): HttpsOptions | undefined {
  const key = (keyPath ?? '').trim();
  const cert = (certPath ?? '').trim();

  if (!key && !cert) {
    return undefined;
  }
  if (!key || !cert) {
    throw new Error(
      'HTTPS_KEY_PATH and HTTPS_CERT_PATH must be set together. See backend/.env.example.',
    );
  }

  try {
    return { key: readFile(key), cert: readFile(cert) };
  } catch (error) {
    throw new Error(
      `Could not read TLS files (HTTPS_KEY_PATH=${key}, HTTPS_CERT_PATH=${cert}): ${(error as Error).message}`,
    );
  }
}
