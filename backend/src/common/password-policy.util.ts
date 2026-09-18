import { Repository } from 'typeorm';
import { MofConfig } from '../modules/unidades/entities/mof-config.entity';

const FALLBACK_MIN = 6;

/** Longitud mínima efectiva según mof_config (nunca por debajo de 6). */
export async function resolvePasswordMinLength(
  repo: Repository<MofConfig>,
): Promise<number> {
  const row = await repo.findOne({ where: { id: 1 } });
  const min = Number(row?.passwordPolicy?.minLength);
  return Number.isFinite(min) && min >= FALLBACK_MIN ? min : FALLBACK_MIN;
}
