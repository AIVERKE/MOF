import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadSia } from './entities/unidad-sia.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { UnidadDto } from './dto/unidad.dto';
import { UnidadesService } from './unidades.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/errors';

type Sia = {
  id?: string;
  unidadId: string;
  aprobados?: number | null;
  reprobados?: number | null;
  matriculados?: number | null;
  deletedAt?: Date | null;
};

const CARRERA = 28;
const FACULTAD = 24;
const CLASES: Record<number, string> = {
  [CARRERA]: 'DIRECCIONES DE CARRERA',
  [FACULTAD]: 'DECANATOS',
};

/** Tabla `unidad_sia` en memoria; la transacción revierte si el callback falla. */
function createFakeDb(seed: Sia[] = []) {
  let rows: Sia[] = seed.map((r) => ({ deletedAt: null, ...r }));
  let nextId = 100;
  const vigentes = (unidadId: string) =>
    rows.filter((r) => r.unidadId === unidadId && !r.deletedAt);

  const m = {
    save: jest.fn((x: Sia | Sia[] | { codigo: string; id?: string }) => {
      for (const r of Array.isArray(x) ? x : [x]) {
        if ('codigo' in r) {
          r.id ??= '50';
          continue;
        }
        if (r.id == null) {
          r.id = String(nextId++);
          r.deletedAt = null;
          rows.push(r);
        }
      }
      return Promise.resolve(x);
    }),
    find: jest.fn((_e: unknown, opts: { where: { unidadId: string } }) =>
      Promise.resolve(vigentes(opts.where.unidadId)),
    ),
    create: jest.fn((_e: unknown, data: Sia) => ({ ...data })),
    softRemove: jest.fn((list: Sia[]) => {
      list.forEach((r) => (r.deletedAt = new Date()));
      return Promise.resolve(list);
    }),
  };

  const transaction = jest.fn(
    async (cb: (mgr: typeof m) => Promise<unknown>) => {
      const snapshot = rows.map((r) => ({ ...r }));
      try {
        return await cb(m);
      } catch (e) {
        rows = snapshot;
        throw e;
      }
    },
  );

  const siaRepo = {
    findOne: jest.fn((opts: { where: { id: string; unidadId: string } }) =>
      Promise.resolve(
        vigentes(opts.where.unidadId).find((r) => r.id === opts.where.id) ??
          null,
      ),
    ),
    find: jest.fn((opts: { where: { unidadId: string } }) =>
      Promise.resolve(vigentes(opts.where.unidadId)),
    ),
    create: jest.fn((data: Sia) => ({ ...data })),
    save: m.save,
    softRemove: jest.fn((r: Sia) => m.softRemove([r])),
  };

  return {
    m,
    transaction,
    siaRepo,
    vigentes: (unidadId: string) =>
      vigentes(unidadId).map(({ id, aprobados, reprobados, matriculados }) => ({
        id,
        aprobados,
        reprobados,
        matriculados,
      })),
  };
}

/** Unidades 10 y 20 son Carreras; la 30 es una Facultad. */
function buildService(
  db: ReturnType<typeof createFakeDb>,
  claseDe: Record<string, number> = {
    '10': CARRERA,
    '20': CARRERA,
    '30': FACULTAD,
  },
) {
  const unidadRepo = {
    findOne: jest.fn((opts: { where: { id?: string } }) => {
      const id = opts.where.id;
      if (id == null || claseDe[id] == null) return Promise.resolve(null);
      const tipoUnidadId = claseDe[id];
      return Promise.resolve({
        id,
        codigo: `U${id}`,
        tipoUnidadId,
        tipoUnidad: { id: tipoUnidadId, descripcion: CLASES[tipoUnidadId] },
      });
    }),
    create: jest.fn((data: object) => ({ ...data })),
    manager: { transaction: db.transaction },
  };
  const claseRepo = {
    findOne: jest.fn((opts: { where: { id: number } }) =>
      Promise.resolve(
        CLASES[opts.where.id]
          ? { id: opts.where.id, descripcion: CLASES[opts.where.id] }
          : null,
      ),
    ),
  };
  const catalogoRepo = { findOne: jest.fn(() => Promise.resolve({ id: 1 })) };
  const unused = {} as never;
  return new UnidadesService(
    unidadRepo as unknown as Repository<Unidad>,
    unused,
    unused,
    unused,
    unused,
    unused,
    catalogoRepo as never,
    catalogoRepo as never,
    catalogoRepo as never,
    claseRepo as unknown as Repository<TipoUnidad>,
    unused,
    unused,
    db.siaRepo as unknown as Repository<UnidadSia>,
  );
}

const dto = (extra: Partial<UnidadDto>) => extra as UnidadDto;

async function expectBusiness(p: Promise<unknown>, code: string) {
  const err: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BusinessException);
  expect((err as BusinessException).errorCode).toBe(code);
}

describe('UnidadesService SIA (PUT /unidades/:id)', () => {
  it('crea filas nuevas en una Carrera, aceptando valores nulos', async () => {
    const db = createFakeDb();
    await buildService(db).update(
      10,
      dto({
        sia: [
          { aprobados: 80, reprobados: 20, matriculados: 100 },
          { matriculados: 50 },
        ],
      }),
    );
    expect(db.vigentes('10')).toEqual([
      { id: '100', aprobados: 80, reprobados: 20, matriculados: 100 },
      { id: '101', aprobados: null, reprobados: null, matriculados: 50 },
    ]);
  });

  it('actualiza por id, crea las nuevas y da de baja las omitidas', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
      {
        id: '2',
        unidadId: '10',
        aprobados: 5,
        reprobados: 5,
        matriculados: 10,
      },
    ]);
    await buildService(db).update(
      10,
      dto({
        sia: [
          { id: 1, aprobados: 3, reprobados: 1, matriculados: 4 },
          { aprobados: 0, reprobados: 0, matriculados: 0 },
        ],
      }),
    );
    expect(db.vigentes('10')).toEqual([
      { id: '1', aprobados: 3, reprobados: 1, matriculados: 4 },
      { id: '100', aprobados: 0, reprobados: 0, matriculados: 0 },
    ]);
  });

  it('lista vacía da de baja todas las filas de la Carrera', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
    await buildService(db).update(10, dto({ sia: [] }));
    expect(db.vigentes('10')).toEqual([]);
  });

  it('sin el campo sia no modifica nada', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
    await buildService(db).update(10, dto({ objetivo: 'x' }));
    expect(db.m.find).not.toHaveBeenCalled();
    expect(db.vigentes('10')).toHaveLength(1);
  });

  it('rechaza una fila sin ningún valor', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
    await expectBusiness(
      buildService(db).update(
        10,
        dto({ sia: [{ aprobados: null, reprobados: null }] }),
      ),
      ErrorCodes.SIA_FILA_VACIA,
    );
    expect(db.vigentes('10')).toHaveLength(1);
  });

  it('rechaza un id de otra unidad sin tocar ninguna de las dos', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
      {
        id: '2',
        unidadId: '20',
        aprobados: 7,
        reprobados: 3,
        matriculados: 10,
      },
    ]);
    await expectBusiness(
      buildService(db).update(10, dto({ sia: [{ id: 2, aprobados: 9 }] })),
      ErrorCodes.SIA_NO_PERTENECE_UNIDAD,
    );
    expect(db.vigentes('10')).toHaveLength(1);
    expect(db.vigentes('20')).toEqual([
      { id: '2', aprobados: 7, reprobados: 3, matriculados: 10 },
    ]);
  });

  it('rechaza ids repetidos en la solicitud', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
    await expectBusiness(
      buildService(db).update(
        10,
        dto({
          sia: [
            { id: 1, aprobados: 2 },
            { id: 1, aprobados: 3 },
          ],
        }),
      ),
      ErrorCodes.SIA_ID_DUPLICADO,
    );
    expect(db.vigentes('10')).toEqual([
      { id: '1', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
  });

  it('rechaza filas en una unidad que no es Carrera', async () => {
    const db = createFakeDb();
    await expectBusiness(
      buildService(db).update(30, dto({ sia: [{ matriculados: 10 }] })),
      ErrorCodes.SIA_SOLO_CARRERA,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('ignora una lista vacía en una unidad que no es Carrera y conserva sus filas', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '30', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
    await buildService(db).update(30, dto({ sia: [] }));
    expect(db.m.softRemove).not.toHaveBeenCalled();
    expect(db.vigentes('30')).toHaveLength(1);
  });

  it('acepta SIA al reclasificar la unidad como Carrera en el mismo PUT', async () => {
    const db = createFakeDb();
    await buildService(db).update(
      30,
      dto({ tipoUnidad: CARRERA, sia: [{ matriculados: 40 }] }),
    );
    expect(db.vigentes('30')).toEqual([
      { id: '100', aprobados: null, reprobados: null, matriculados: 40 },
    ]);
  });

  it('rechaza SIA al reclasificar una Carrera a otra clase en el mismo PUT', async () => {
    const db = createFakeDb();
    await expectBusiness(
      buildService(db).update(
        10,
        dto({ tipoUnidad: FACULTAD, sia: [{ matriculados: 40 }] }),
      ),
      ErrorCodes.SIA_SOLO_CARRERA,
    );
  });
});

describe('UnidadesService SIA (POST /unidades)', () => {
  const base = {
    codigo: 'X.1',
    sigla: 'XCAR',
    nombre: 'Carrera X',
    tipo: 1,
    nivel: 1,
    relacion: 1,
  };

  it('crea la unidad Carrera con sus filas SIA', async () => {
    const db = createFakeDb();
    await buildService(db).create(
      dto({ ...base, tipoUnidad: CARRERA, sia: [{ aprobados: 5 }] }),
    );
    expect(db.vigentes('50')).toEqual([
      { id: '100', aprobados: 5, reprobados: null, matriculados: null },
    ]);
  });

  it('rechaza filas SIA al crear una unidad que no es Carrera', async () => {
    const db = createFakeDb();
    await expectBusiness(
      buildService(db).create(
        dto({ ...base, tipoUnidad: FACULTAD, sia: [{ aprobados: 5 }] }),
      ),
      ErrorCodes.SIA_SOLO_CARRERA,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe('UnidadesService SIA (CRUD)', () => {
  it('lista solo las filas de la Carrera pedida', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', aprobados: 1, reprobados: 1, matriculados: 2 },
      {
        id: '2',
        unidadId: '20',
        aprobados: 7,
        reprobados: 3,
        matriculados: 10,
      },
    ]);
    await expect(buildService(db).listSia(20)).resolves.toEqual([
      { id: 2, aprobados: 7, reprobados: 3, matriculados: 10 },
    ]);
  });

  it('agrega, actualiza y elimina una fila', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expect(
      service.addSia(10, { aprobados: 8, reprobados: 2, matriculados: 10 }),
    ).resolves.toEqual({
      id: 100,
      aprobados: 8,
      reprobados: 2,
      matriculados: 10,
    });
    await expect(
      service.updateSia(10, 100, { matriculados: 12 }),
    ).resolves.toEqual({
      id: 100,
      aprobados: null,
      reprobados: null,
      matriculados: 12,
    });
    await expect(service.removeSia(10, 100)).resolves.toBe(true);
    expect(db.vigentes('10')).toEqual([]);
  });

  it('responde 404 al acceder a la fila desde otra unidad', async () => {
    const db = createFakeDb([
      {
        id: '2',
        unidadId: '20',
        aprobados: 7,
        reprobados: 3,
        matriculados: 10,
      },
    ]);
    const service = buildService(db);
    await expectBusiness(service.getSia(10, 2), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.updateSia(10, 2, { aprobados: 1 }),
      ErrorCodes.NOT_FOUND,
    );
    await expectBusiness(service.removeSia(10, 2), ErrorCodes.NOT_FOUND);
    expect(db.vigentes('20')).toHaveLength(1);
  });

  it('oculta y bloquea el SIA en una unidad que no es Carrera', async () => {
    const db = createFakeDb([
      { id: '3', unidadId: '30', aprobados: 1, reprobados: 1, matriculados: 2 },
    ]);
    const service = buildService(db);
    await expect(service.listSia(30)).resolves.toEqual([]);
    await expectBusiness(service.getSia(30, 3), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.addSia(30, { aprobados: 1 }),
      ErrorCodes.SIA_SOLO_CARRERA,
    );
    await expectBusiness(
      service.updateSia(30, 3, { aprobados: 1 }),
      ErrorCodes.SIA_SOLO_CARRERA,
    );
    await expectBusiness(service.removeSia(30, 3), ErrorCodes.SIA_SOLO_CARRERA);
    expect(db.vigentes('30')).toHaveLength(1);
  });

  it('rechaza agregar una fila vacía', async () => {
    await expectBusiness(
      buildService(createFakeDb()).addSia(10, {}),
      ErrorCodes.SIA_FILA_VACIA,
    );
  });

  it('responde 404 si la unidad no existe', async () => {
    const service = buildService(createFakeDb());
    await expectBusiness(service.listSia(99), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.addSia(99, { aprobados: 1 }),
      ErrorCodes.NOT_FOUND,
    );
  });
});
