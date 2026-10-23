import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadesService } from './unidades.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/errors';

type Contadores = { vistas_count: number; descargas_count: number };

/** Tabla `unidad` en memoria que interpreta el UPDATE de `incrementarContador`. */
function createFakeDb(
  seed: Record<string, Contadores & { deleted?: boolean }>,
) {
  const rows = new Map(Object.entries(seed).map(([id, r]) => [id, { ...r }]));
  const query = jest.fn((sql: string, params: [number]) => {
    const columna = /SET "(\w+)"/.exec(sql)?.[1] as keyof Contadores;
    const row = rows.get(String(params[0]));
    if (!row || row.deleted) return Promise.resolve([]);
    row[columna] += 1;
    // Postgres devuelve los integer como number.
    return Promise.resolve([
      { vistas_count: row.vistas_count, descargas_count: row.descargas_count },
    ]);
  });
  const unidadRepo = {
    query,
    findOne: jest.fn((opts: { where: { id?: string } }) => {
      const row = opts.where.id ? rows.get(opts.where.id) : undefined;
      return Promise.resolve(
        row
          ? {
              id: opts.where.id,
              codigo: `U${opts.where.id}`,
              vistasCount: row.vistas_count,
              descargasCount: row.descargas_count,
            }
          : null,
      );
    }),
    find: jest.fn(() => Promise.resolve([])),
  };
  return { rows, unidadRepo };
}

function buildService(db: ReturnType<typeof createFakeDb>) {
  const vacio = { find: jest.fn(() => Promise.resolve([])) };
  const unused = {} as never;
  return new UnidadesService(
    db.unidadRepo as unknown as Repository<Unidad>,
    vacio as never,
    vacio as never,
    unused,
    vacio as never,
    vacio as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    vacio as never,
    vacio as never,
  );
}

async function expectBusiness(p: Promise<unknown>, code: string) {
  const err: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BusinessException);
  expect((err as BusinessException).errorCode).toBe(code);
}

const seed = () => ({
  '10': { vistas_count: 5, descargas_count: 2 },
  '20': { vistas_count: 0, descargas_count: 0 },
  '30': { vistas_count: 1, descargas_count: 1, deleted: true },
});

describe('UnidadesService contadores de uso', () => {
  it('dos aperturas suman 2 vistas y devuelven los totales', async () => {
    const db = createFakeDb(seed());
    const service = buildService(db);

    await service.registrarVista(10);
    expect(await service.registrarVista(10)).toEqual({
      vistasCount: 7,
      descargasCount: 2,
    });
  });

  it('una descarga suma 1 descarga y no suma vistas', async () => {
    const db = createFakeDb(seed());
    expect(await buildService(db).registrarDescarga(10)).toEqual({
      vistasCount: 5,
      descargasCount: 3,
    });
  });

  it('los contadores de cada unidad son independientes', async () => {
    const db = createFakeDb(seed());
    const service = buildService(db);
    await service.registrarVista(10);
    await service.registrarDescarga(10);
    expect(db.rows.get('20')).toEqual({ vistas_count: 0, descargas_count: 0 });
  });

  it('incrementa con un UPDATE atómico parametrizado sobre la columna correcta', async () => {
    const db = createFakeDb(seed());
    const service = buildService(db);
    await service.registrarVista(10);
    await service.registrarDescarga(10);

    const [[sqlVista, paramsVista], [sqlDescarga]] = db.unidadRepo.query.mock
      .calls as [string, unknown[]][];
    expect(sqlVista).toMatch(/SET "vistas_count" = "vistas_count" \+ 1/);
    expect(sqlVista).toMatch(/"deleted_at" IS NULL/);
    expect(paramsVista).toEqual([10]);
    expect(sqlDescarga).toMatch(
      /SET "descargas_count" = "descargas_count" \+ 1/,
    );
  });

  it.each([
    ['inexistente', 99],
    ['dada de baja', 30],
  ])('una unidad %s responde NOT_FOUND', async (_c, id) => {
    const db = createFakeDb(seed());
    await expectBusiness(
      buildService(db).registrarVista(id),
      ErrorCodes.NOT_FOUND,
    );
    await expectBusiness(
      buildService(db).registrarDescarga(id),
      ErrorCodes.NOT_FOUND,
    );
  });

  it('consultar el detalle expone los contadores sin incrementarlos', async () => {
    const db = createFakeDb(seed());
    const detalle = await buildService(db).findById(10);
    expect(detalle).toMatchObject({ vistasCount: 5, descargasCount: 2 });
    expect(db.unidadRepo.query).not.toHaveBeenCalled();
  });
});
