import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadRelacionInterna } from './entities/unidad-relacion-interna.entity';
import { UnidadDependenciaFuncional } from './entities/unidad-dependencia-funcional.entity';
import { UnidadRelacionExterna } from './entities/unidad-relacion-externa.entity';
import { UnidadDto } from './dto/unidad.dto';
import { UnidadesService, normalizeRelIds } from './unidades.service';

type Row = Record<string, unknown>;

/** Manager en memoria cuya transacción revierte las tablas si el callback falla. */
function createFakeManager(existingUnidadIds: number[]) {
  let tables = new Map<unknown, Row[]>([
    [UnidadRelacionInterna, []],
    [UnidadDependenciaFuncional, []],
    [UnidadRelacionExterna, []],
  ]);
  const failInsertOn = new Set<unknown>();

  const m = {
    save: jest.fn((x: unknown) => Promise.resolve(x)),
    find: jest.fn(
      (_entity: unknown, opts: { where: { id: { value: string[] } } }) =>
        Promise.resolve(
          opts.where.id.value
            .filter((id) => existingUnidadIds.includes(Number(id)))
            .map((id) => ({ id })),
        ),
    ),
    delete: jest.fn((entity: unknown, where: { unidadId: string }) => {
      tables.set(
        entity,
        (tables.get(entity) ?? []).filter((r) => r.unidadId !== where.unidadId),
      );
      return Promise.resolve();
    }),
    insert: jest.fn((entity: unknown, rows: Row[]) => {
      if (failInsertOn.has(entity)) return Promise.reject(new Error('boom'));
      tables.get(entity)!.push(...rows);
      return Promise.resolve();
    }),
  };

  const transaction = jest.fn(
    async (cb: (mgr: typeof m) => Promise<unknown>) => {
      const snapshot = new Map(
        [...tables].map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
      );
      try {
        return await cb(m);
      } catch (e) {
        tables = snapshot;
        throw e;
      }
    },
  );

  return {
    m,
    transaction,
    failInsertOn,
    rows: (entity: unknown) => tables.get(entity) ?? [],
    seed: (entity: unknown, rows: Row[]) => tables.get(entity)!.push(...rows),
  };
}

function buildService(fake: ReturnType<typeof createFakeManager>) {
  const unidadRepo = {
    findOne: jest.fn().mockResolvedValue({ id: '10', codigo: 'U10' }),
    manager: { transaction: fake.transaction },
  };
  const unused = {} as never;
  return new UnidadesService(
    unidadRepo as unknown as Repository<Unidad>,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
  );
}

const dto = (extra: Partial<UnidadDto>) => extra as UnidadDto;

describe('normalizeRelIds', () => {
  it('deduplica, quita la propia unidad e ids inválidos y conserva el primer tipo', () => {
    const out = normalizeRelIds(
      [
        5,
        '5',
        { relacionadaId: 7, tipo: 'A' },
        { relacionadaId: 7, tipo: 'B' },
        10,
        0,
        -3,
        1.5,
        'abc',
        null,
        undefined,
        { relacionadaId: undefined },
      ],
      10,
    );
    expect([...out.entries()]).toEqual([
      [5, null],
      [7, 'A'],
    ]);
  });
});

describe('UnidadesService.update relaciones', () => {
  it('guarda una sola fila por unidad aunque el payload traiga repetidos', async () => {
    const fake = createFakeManager([20, 21]);
    const service = buildService(fake);

    await service.update(
      10,
      dto({ relacionesInternas: [20, 20, { relacionadaId: 21 }, 21, 10] }),
    );

    expect(
      fake.rows(UnidadRelacionInterna).map((r) => r.relacionadaId),
    ).toEqual(['20', '21']);
    expect(fake.m.insert).toHaveBeenCalledTimes(1);
  });

  it('descarta unidades inexistentes o eliminadas', async () => {
    const fake = createFakeManager([20]);
    const service = buildService(fake);

    await service.update(10, dto({ relacionesInternas: [20, 999] }));

    expect(
      fake.rows(UnidadRelacionInterna).map((r) => r.relacionadaId),
    ).toEqual(['20']);
  });

  it('deduplica dependencias funcionales', async () => {
    const fake = createFakeManager([30]);
    const service = buildService(fake);

    await service.update(10, dto({ dependenciasFuncionales: [30, 30, 10] }));

    expect(
      fake.rows(UnidadDependenciaFuncional).map((r) => r.dependenciaId),
    ).toEqual(['30']);
  });

  it('si falla un insert, revierte y conserva las relaciones previas', async () => {
    const fake = createFakeManager([20, 21]);
    fake.seed(UnidadRelacionInterna, [{ unidadId: '10', relacionadaId: '20' }]);
    fake.failInsertOn.add(UnidadRelacionExterna);
    const service = buildService(fake);

    await expect(
      service.update(
        10,
        dto({ relacionesInternas: [21], relacionesExternas: ['Ministerio'] }),
      ),
    ).rejects.toThrow('boom');

    expect(
      fake.rows(UnidadRelacionInterna).map((r) => r.relacionadaId),
    ).toEqual(['20']);
  });
});
