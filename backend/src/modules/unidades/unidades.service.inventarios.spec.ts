import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadInventario } from './entities/unidad-inventario.entity';
import { UnidadDto } from './dto/unidad.dto';
import { UnidadesService } from './unidades.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/errors';

type Inv = {
  id?: string;
  unidadId: string;
  descripcion?: string;
  cantidad?: number;
  deletedAt?: Date | null;
};

/** Tabla `unidad_inventario` en memoria; la transacción revierte si el callback falla. */
function createFakeDb(seed: Inv[] = []) {
  let rows: Inv[] = seed.map((r) => ({ deletedAt: null, ...r }));
  let nextId = 100;
  const vigentes = (unidadId: string) =>
    rows.filter((r) => r.unidadId === unidadId && !r.deletedAt);

  const m = {
    save: jest.fn((x: Inv | Inv[]) => {
      for (const r of Array.isArray(x) ? x : [x]) {
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
    create: jest.fn((_e: unknown, data: Inv) => ({ ...data })),
    softRemove: jest.fn((list: Inv[]) => {
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

  const inventarioRepo = {
    findOne: jest.fn((opts: { where: { id: string; unidadId: string } }) =>
      Promise.resolve(
        vigentes(opts.where.unidadId).find((r) => r.id === opts.where.id) ??
          null,
      ),
    ),
    find: jest.fn((opts: { where: { unidadId: string } }) =>
      Promise.resolve(vigentes(opts.where.unidadId)),
    ),
    create: jest.fn((data: Inv) => ({ ...data })),
    save: m.save,
    softRemove: jest.fn((r: Inv) => m.softRemove([r])),
  };

  return {
    m,
    transaction,
    inventarioRepo,
    vigentes: (unidadId: string) =>
      vigentes(unidadId).map(({ id, descripcion, cantidad }) => ({
        id,
        descripcion,
        cantidad,
      })),
  };
}

function buildService(
  db: ReturnType<typeof createFakeDb>,
  unidadesExistentes = ['10', '20'],
) {
  const unidadRepo = {
    findOne: jest.fn((opts: { where: { id: string } }) =>
      Promise.resolve(
        unidadesExistentes.includes(opts.where.id)
          ? { id: opts.where.id, codigo: `U${opts.where.id}` }
          : null,
      ),
    ),
    manager: { transaction: db.transaction },
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
    db.inventarioRepo as unknown as Repository<UnidadInventario>,
    unused,
    unused,
    unused,
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

describe('UnidadesService inventarios (PUT /unidades/:id)', () => {
  it('crea varias filas nuevas', async () => {
    const db = createFakeDb();
    await buildService(db).update(
      10,
      dto({
        inventarios: [
          { descripcion: ' Escritorio ', cantidad: 2 },
          { descripcion: 'Silla', cantidad: 5 },
        ],
      }),
    );
    expect(db.vigentes('10')).toEqual([
      { id: '100', descripcion: 'Escritorio', cantidad: 2 },
      { id: '101', descripcion: 'Silla', cantidad: 5 },
    ]);
  });

  it('actualiza por id, crea las nuevas y da de baja las omitidas', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', descripcion: 'Escritorio', cantidad: 1 },
      { id: '2', unidadId: '10', descripcion: 'Silla', cantidad: 1 },
    ]);
    await buildService(db).update(
      10,
      dto({
        inventarios: [
          { id: 1, descripcion: 'Escritorio', cantidad: 4 },
          { descripcion: 'Impresora', cantidad: 1 },
        ],
      }),
    );
    expect(db.vigentes('10')).toEqual([
      { id: '1', descripcion: 'Escritorio', cantidad: 4 },
      { id: '100', descripcion: 'Impresora', cantidad: 1 },
    ]);
  });

  it('lista vacía da de baja todo el inventario de la unidad', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', descripcion: 'Escritorio', cantidad: 1 },
    ]);
    await buildService(db).update(10, dto({ inventarios: [] }));
    expect(db.vigentes('10')).toEqual([]);
  });

  it('sin el campo inventarios no modifica nada', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', descripcion: 'Escritorio', cantidad: 1 },
    ]);
    await buildService(db).update(10, dto({ objetivo: 'x' }));
    expect(db.m.find).not.toHaveBeenCalled();
    expect(db.vigentes('10')).toHaveLength(1);
  });

  it('rechaza un id de otra unidad sin tocar ninguna de las dos', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', descripcion: 'Escritorio', cantidad: 1 },
      { id: '2', unidadId: '20', descripcion: 'Proyector', cantidad: 1 },
    ]);
    await expectBusiness(
      buildService(db).update(
        10,
        dto({ inventarios: [{ id: 2, descripcion: 'Ajeno', cantidad: 9 }] }),
      ),
      ErrorCodes.INVENTARIO_NO_PERTENECE_UNIDAD,
    );
    expect(db.vigentes('10')).toHaveLength(1);
    expect(db.vigentes('20')).toEqual([
      { id: '2', descripcion: 'Proyector', cantidad: 1 },
    ]);
  });

  it('rechaza ids repetidos en la solicitud', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', descripcion: 'Escritorio', cantidad: 1 },
    ]);
    await expectBusiness(
      buildService(db).update(
        10,
        dto({
          inventarios: [
            { id: 1, descripcion: 'A', cantidad: 1 },
            { id: 1, descripcion: 'B', cantidad: 2 },
          ],
        }),
      ),
      ErrorCodes.INVENTARIO_ID_DUPLICADO,
    );
    expect(db.vigentes('10')).toEqual([
      { id: '1', descripcion: 'Escritorio', cantidad: 1 },
    ]);
  });
});

describe('UnidadesService inventarios (CRUD)', () => {
  it('lista solo el inventario de la unidad pedida', async () => {
    const db = createFakeDb([
      { id: '1', unidadId: '10', descripcion: 'Escritorio', cantidad: 1 },
      { id: '2', unidadId: '20', descripcion: 'Proyector', cantidad: 3 },
    ]);
    await expect(buildService(db).listInventarios(20)).resolves.toEqual([
      { id: 2, descripcion: 'Proyector', cantidad: 3 },
    ]);
  });

  it('agrega, actualiza y elimina un ítem', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expect(
      service.addInventario(10, { descripcion: 'Silla', cantidad: 2 }),
    ).resolves.toEqual({ id: 100, descripcion: 'Silla', cantidad: 2 });
    await expect(
      service.updateInventario(10, 100, { descripcion: 'Silla', cantidad: 6 }),
    ).resolves.toEqual({ id: 100, descripcion: 'Silla', cantidad: 6 });
    await expect(service.removeInventario(10, 100)).resolves.toBe(true);
    expect(db.vigentes('10')).toEqual([]);
  });

  it('responde 404 al acceder al ítem desde otra unidad', async () => {
    const db = createFakeDb([
      { id: '2', unidadId: '20', descripcion: 'Proyector', cantidad: 1 },
    ]);
    const service = buildService(db);
    await expectBusiness(service.getInventario(10, 2), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.updateInventario(10, 2, { descripcion: 'X', cantidad: 1 }),
      ErrorCodes.NOT_FOUND,
    );
    await expectBusiness(service.removeInventario(10, 2), ErrorCodes.NOT_FOUND);
    expect(db.vigentes('20')).toHaveLength(1);
  });

  it('responde 404 si la unidad no existe', async () => {
    const service = buildService(createFakeDb());
    await expectBusiness(service.listInventarios(99), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.addInventario(99, { descripcion: 'X', cantidad: 1 }),
      ErrorCodes.NOT_FOUND,
    );
  });
});
