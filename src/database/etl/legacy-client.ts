import { Pool, PoolConfig } from 'pg';
import { config } from 'dotenv';

config();

export type EtlOptions = {
  dryRun: boolean;
  truncate: boolean;
};

export function parseCliArgs(argv: string[]): EtlOptions {
  return {
    dryRun: argv.includes('--dry-run'),
    truncate: argv.includes('--truncate'),
  };
}

function poolFromEnv(prefix: 'DB' | 'LEGACY_DB'): PoolConfig {
  const hostKey = prefix === 'DB' ? 'DB_HOST' : 'LEGACY_DB_HOST';
  const portKey = prefix === 'DB' ? 'DB_PORT' : 'LEGACY_DB_PORT';
  const userKey = prefix === 'DB' ? 'DB_USERNAME' : 'LEGACY_DB_USERNAME';
  const passKey = prefix === 'DB' ? 'DB_PASSWORD' : 'LEGACY_DB_PASSWORD';
  const dbKey = prefix === 'DB' ? 'DB_DATABASE' : 'LEGACY_DB_DATABASE';

  return {
    host: process.env[hostKey] || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env[portKey] || process.env.DB_PORT || '5432', 10),
    user: process.env[userKey] || process.env.DB_USERNAME || 'postgres',
    password: process.env[passKey] || process.env.DB_PASSWORD || '',
    database:
      prefix === 'DB'
        ? process.env.DB_DATABASE || 'mof_db'
        : process.env.LEGACY_DB_DATABASE || 'umsa_legacy',
  };
}

export function createLegacyPool(): Pool {
  return new Pool(poolFromEnv('LEGACY_DB'));
}

export function createTargetPool(): Pool {
  return new Pool(poolFromEnv('DB'));
}

export type PhaseStats = {
  phase: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export function emptyStats(phase: string): PhaseStats {
  return { phase, inserted: 0, updated: 0, skipped: 0, errors: [] };
}

export function logStats(stats: PhaseStats): void {
  const err = stats.errors.length ? ` errors=${stats.errors.length}` : '';
  console.log(
    `[${stats.phase}] inserted=${stats.inserted} updated=${stats.updated} skipped=${stats.skipped}${err}`,
  );
  for (const e of stats.errors.slice(0, 10)) {
    console.error(`  ! ${e}`);
  }
  if (stats.errors.length > 10) {
    console.error(`  ... +${stats.errors.length - 10} more`);
  }
}

export function slugCodigo(descripcion: string, id: number | string): string {
  const base = (descripcion || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);
  if (base.length >= 2) return base.slice(0, 32);
  return `TU${id}`.slice(0, 32);
}

export function uniqueSigla(codigo: string, id: number | string): string {
  const raw = (codigo || String(id)).trim();
  if (raw.length > 0 && raw.length <= 32) return raw;
  return String(raw).slice(0, 28) + '-' + String(id).slice(-3);
}
