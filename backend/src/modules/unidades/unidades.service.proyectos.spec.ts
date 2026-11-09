import { FindOperator, Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { Proyecto } from './entities/proyecto.entity';
import { ProyectoUnidad } from './entities/proyecto-unidad.entity';
import { TipoProyecto } from './entities/tipo-proyecto.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { ProyectoDto, UnidadDto } from './dto/unidad.dto';
import {
  UnidadesService,
  agruparProyectosPorTipo,
  aplicanProyectos,
} from './unidades.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/errors';

const CLASES: Record<number, string> = {
  1: 'RECTORADO',
  22: 'SECRETARÍA',
  24: 'DECANATOS',
  27: 'VICEDECANATOS',
  28: 'DIRECCIONES DE CARRERA',
  29: 'DIRECCIONES DE INSTITUTOS',
};

type FilaUnidad = {
  id: string;
  codigo: string;
  sigla: string;
  nombre: string;
  tipoUnidadId: number;
  parentId: string | null;
  deletedAt?: Date | null;
};

/**
 * Árbol de prueba: Rectorado (1) → Secretaría central (2), Decanato de Ciencias
 * Sociales (10) → Vicedecanato (11) y Carrera de Sociología (12) → Instituto
 * (13); Decanato de Ciencias Puras (20) → Informática (21) y Química (22).
 */
const UNIDADES: FilaUnidad[] = [
  ['1', 'RECTORADO', 1, null],
  ['2', 'SECRETARÍA GENERAL', 22, '1'],
  ['10', 'FACULTAD DE CIENCIAS SOCIALES - DECANATO', 24, '1'],
  ['11', 'FCS - VICEDECANATO', 27, '10'],
  ['12', 'CARRERA DE SOCIOLOGÍA', 28, '10'],
  ['13', 'INSTITUTO DE INVESTIGACIONES SOCIOLÓGICAS', 29, '12'],
  ['20', 'FACULTAD DE CIENCIAS PURAS Y NATURALES - DECANATO', 24, '1'],
  ['21', 'CARRERA DE INFORMÁTICA', 28, '20'],
  ['22', 'CARRERA DE QUÍMICA', 28, '20'],
].map(([id, nombre, tipoUnidadId, parentId]) => ({
  id: id as string,
  codigo: `C${id as string}`,
  sigla: `S${id as string}`,
  nombre: nombre as string,
  tipoUnidadId: tipoUnidadId as number,
  parentId: parentId as string | null,
}));

type FilaProyecto = {
  id?: string;
  tipoProyectoId: number;
  detalle: string;
  deletedAt?: Date | null;
};
type FilaTipo = { id?: number; descripcion: string; activo: boolean };

/** Catálogo sembrado por la migración, más un tipo dado de baja. */
const ACADEMICO = 1;
const INVESTIGACION = 2;
const INTERACCION = 3;
const INACTIVO = 4;
const TIPOS: FilaTipo[] = [
  { id: ACADEMICO, descripcion: 'Programa Académico', activo: true },
  { id: INVESTIGACION, descripcion: 'Programa Investigación', activo: true },
  {
    id: INTERACCION,
    descripcion: 'Programa Interacción Social y Extensión Universitaria',
    activo: true,
  },
  { id: INACTIVO, descripcion: 'Programa Antiguo', activo: false },
];
type Vinculo = { proyectoId: string; unidadId: string };

const valores = (v: unknown): string[] =>
  v instanceof FindOperator ? (v.value as unknown[]).map(String) : [String(v)];

/** Tablas `unidad`, `tipo_proyecto`, `proyecto` y `proyecto_unidad` en memoria; la transacción revierte si falla. */
function createFakeDb(
  seed: { proyectos?: FilaProyecto[]; vinculos?: Vinculo[] } = {},
) {
  const unidades = new Map(UNIDADES.map((u) => [u.id, { ...u }]));
  let proyectos: FilaProyecto[] = (seed.proyectos ?? []).map((p) => ({
    deletedAt: null,
    ...p,
  }));
  let vinculos: Vinculo[] = [...(seed.vinculos ?? [])];
  const tipos: FilaTipo[] = TIPOS.map((t) => ({ ...t }));
  let nextId = 100;

  const conClase = (u: FilaUnidad) => ({
    ...u,
    tipoUnidad: { id: u.tipoUnidadId, descripcion: CLASES[u.tipoUnidadId] },
    parent: null,
  });
  const vigentes = () => proyectos.filter((p) => !p.deletedAt);
  const conUnidades = (p: FilaProyecto) => ({
    ...p,
    tipoProyecto: tipos.find((t) => t.id === p.tipoProyectoId) ?? null,
    unidades: vinculos
      .filter((v) => v.proyectoId === p.id)
      .map((v) => ({ ...v, unidad: unidades.get(v.unidadId) ?? null })),
  });

  const m = {
    find: jest.fn(
      (entity: unknown, opts: { where: Record<string, unknown> }) => {
        const w = opts.where;
        if (entity === ProyectoUnidad) {
          return Promise.resolve(
            vinculos.filter(
              (v) =>
                (w.unidadId === undefined ||
                  valores(w.unidadId).includes(v.unidadId)) &&
                (w.proyectoId === undefined ||
                  valores(w.proyectoId).includes(v.proyectoId)),
            ),
          );
        }
        const ids = valores(w.id);
        return Promise.resolve(vigentes().filter((p) => ids.includes(p.id!)));
      },
    ),
    create: jest.fn((_e: unknown, data: object) => ({ ...data })),
    save: jest.fn((x: FilaProyecto | FilaUnidad) => {
      if ('codigo' in x) {
        x.id ??= '50';
        unidades.set(x.id, { ...x });
        return Promise.resolve(x);
      }
      if (x.id == null) {
        x.id = String(nextId++);
        proyectos.push({ ...x, deletedAt: null });
      } else {
        const fila = proyectos.find((p) => p.id === x.id)!;
        fila.tipoProyectoId = x.tipoProyectoId;
        fila.detalle = x.detalle;
      }
      return Promise.resolve(x);
    }),
    delete: jest.fn((_e: unknown, w: Record<string, unknown>) => {
      vinculos = vinculos.filter(
        (v) =>
          !(
            (w.unidadId === undefined ||
              valores(w.unidadId).includes(v.unidadId)) &&
            (w.proyectoId === undefined ||
              valores(w.proyectoId).includes(v.proyectoId))
          ),
      );
      return Promise.resolve();
    }),
    insert: jest.fn((_e: unknown, filas: Vinculo[]) => {
      vinculos.push(
        ...filas.map((f) => ({
          proyectoId: String(f.proyectoId),
          unidadId: String(f.unidadId),
        })),
      );
      return Promise.resolve();
    }),
    softDelete: jest.fn((_e: unknown, w: { id: unknown }) => {
      const ids = valores(w.id);
      proyectos
        .filter((p) => ids.includes(p.id!))
        .forEach((p) => (p.deletedAt = new Date()));
      return Promise.resolve();
    }),
  };

  const transaction = jest.fn(
    async (cb: (mgr: typeof m) => Promise<unknown>) => {
      const snapshot = {
        proyectos: proyectos.map((p) => ({ ...p })),
        vinculos: vinculos.map((v) => ({ ...v })),
        unidades: [...unidades.values()].map((u) => ({ ...u })),
      };
      try {
        return await cb(m);
      } catch (e) {
        proyectos = snapshot.proyectos;
        vinculos = snapshot.vinculos;
        unidades.clear();
        snapshot.unidades.forEach((u) => unidades.set(u.id, u));
        throw e;
      }
    },
  );

  const unidadRepo = {
    findOne: jest.fn(
      (opts: { where: { id?: string; codigo?: string; sigla?: string } }) => {
        const { id, codigo, sigla } = opts.where;
        const u =
          id != null
            ? unidades.get(id)
            : [...unidades.values()].find(
                (x) =>
                  (codigo != null && x.codigo === codigo) ||
                  (sigla != null && x.sigla === sigla),
              );
        return Promise.resolve(u && !u.deletedAt ? conClase(u) : null);
      },
    ),
    find: jest.fn((opts?: { where?: { parentId?: string } }) =>
      Promise.resolve(
        [...unidades.values()]
          .filter((u) => !u.deletedAt)
          .filter(
            (u) =>
              opts?.where?.parentId === undefined ||
              u.parentId === opts.where.parentId,
          )
          .map(conClase),
      ),
    ),
    create: jest.fn((data: object) => ({ ...data })),
    manager: { transaction },
  };

  const proyectoRepo = {
    find: jest.fn((opts: { where?: { id: unknown } }) => {
      const ids = opts.where ? valores(opts.where.id) : null;
      return Promise.resolve(
        vigentes()
          .filter((p) => !ids || ids.includes(p.id!))
          .sort((a, b) => Number(a.id) - Number(b.id))
          .map(conUnidades),
      );
    }),
    count: jest.fn((opts: { where: { tipoProyectoId: number } }) =>
      Promise.resolve(
        vigentes().filter((p) => p.tipoProyectoId === opts.where.tipoProyectoId)
          .length,
      ),
    ),
    create: jest.fn((data: object) => ({ ...data })),
    manager: { transaction },
  };

  const tipoProyectoRepo = {
    findOne: jest.fn((opts: { where: { id: number; activo?: boolean } }) => {
      const { id, activo } = opts.where;
      const t = tipos.find(
        (x) => x.id === id && (activo === undefined || x.activo === activo),
      );
      return Promise.resolve(t ? { ...t } : null);
    }),
    find: jest.fn((opts?: { where?: { activo?: boolean } }) =>
      Promise.resolve(
        tipos
          .filter(
            (t) =>
              opts?.where?.activo === undefined ||
              t.activo === opts.where.activo,
          )
          .sort((a, b) => a.id! - b.id!)
          .map((t) => ({ ...t })),
      ),
    ),
    create: jest.fn((data: object) => ({ ...data })),
    save: jest.fn((t: FilaTipo) => {
      if (t.id == null) {
        t.id = Math.max(...tipos.map((x) => x.id!)) + 1;
        tipos.push({ ...t });
      } else {
        Object.assign(
          tipos.find((x) => x.id === t.id)!,
          t,
        );
      }
      return Promise.resolve({ ...t });
    }),
  };

  const proyectoUnidadRepo = {
    find: jest.fn((opts: { where?: { unidadId: string } }) =>
      Promise.resolve(
        vinculos.filter(
          (v) => !opts.where || v.unidadId === opts.where.unidadId,
        ),
      ),
    ),
    findOne: jest.fn((opts: { where: Vinculo }) =>
      Promise.resolve(
        vinculos.find(
          (v) =>
            v.proyectoId === opts.where.proyectoId &&
            v.unidadId === opts.where.unidadId,
        ) ?? null,
      ),
    ),
  };

  return {
    unidades,
    unidadRepo,
    proyectoRepo,
    proyectoUnidadRepo,
    tipoProyectoRepo,
    tipos: () => tipos.map((t) => ({ ...t })),
    proyectos: () =>
      vigentes().map(({ id, tipoProyectoId, detalle }) => ({
        id,
        tipoProyectoId,
        detalle,
      })),
    vinculos: () => vinculos.map((v) => ({ ...v })),
  };
}

function buildService(db: ReturnType<typeof createFakeDb>) {
  const vacio = { find: jest.fn(() => Promise.resolve([])) };
  const catalogoRepo = { findOne: jest.fn(() => Promise.resolve({ id: 1 })) };
  const claseRepo = {
    findOne: jest.fn((opts: { where: { id: number } }) =>
      Promise.resolve(
        CLASES[opts.where.id]
          ? { id: opts.where.id, descripcion: CLASES[opts.where.id] }
          : null,
      ),
    ),
  };
  const unused = {} as never;
  return new UnidadesService(
    db.unidadRepo as unknown as Repository<Unidad>,
    vacio as never,
    vacio as never,
    unused,
    vacio as never,
    vacio as never,
    catalogoRepo as never,
    catalogoRepo as never,
    catalogoRepo as never,
    claseRepo as unknown as Repository<TipoUnidad>,
    unused,
    vacio as never,
    vacio as never,
    db.proyectoRepo as unknown as Repository<Proyecto>,
    db.proyectoUnidadRepo as unknown as Repository<ProyectoUnidad>,
    vacio as never,
    db.tipoProyectoRepo as unknown as Repository<TipoProyecto>,
  );
}

const dto = (extra: Partial<UnidadDto>) => extra as UnidadDto;
const proyecto = (
  tipoId: number,
  detalle = `Detalle del tipo ${tipoId}`,
  extra: Partial<ProyectoDto> = {},
): ProyectoDto => ({ tipoId, detalle, ...extra });

async function expectBusiness(p: Promise<unknown>, code: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BusinessException);
  expect((err as BusinessException).errorCode).toBe(code);
}

describe('aplicanProyectos', () => {
  it('habilita Decanatos y todas sus dependencias, no el nivel central', async () => {
    const db = createFakeDb();
    const rows = await db.unidadRepo.find();
    const aplican = aplicanProyectos(rows as unknown as Unidad[]);
    expect(Object.fromEntries(aplican)).toEqual({
      '1': false,
      '2': false,
      '10': true,
      '11': true,
      '12': true,
      '13': true,
      '20': true,
      '21': true,
      '22': true,
    });
  });
});

describe('agruparProyectosPorTipo', () => {
  it('agrupa sin distinguir mayúsculas, acentos ni espacios y conserva la primera grafía', () => {
    const grupos = agruparProyectosPorTipo([
      { id: 1, tipo: 'Investigación' },
      { id: 2, tipo: 'Académico' },
      { id: 3, tipo: 'investigacion' },
      { id: 4, tipo: 'INVESTIGACIÓN  ' },
    ]);
    expect(grupos).toEqual([
      {
        tipo: 'Académico',
        cantidad: 1,
        proyectos: [{ id: 2, tipo: 'Académico' }],
      },
      {
        tipo: 'Investigación',
        cantidad: 3,
        proyectos: [
          { id: 1, tipo: 'Investigación' },
          { id: 3, tipo: 'investigacion' },
          { id: 4, tipo: 'INVESTIGACIÓN  ' },
        ],
      },
    ]);
  });
});

describe('UnidadesService - proyectos', () => {
  it('registra en un Decanato proyectos de los tres programas y los agrupa por tipo', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    for (const tipoId of [
      INTERACCION,
      ACADEMICO,
      INVESTIGACION,
      INVESTIGACION,
    ]) {
      await service.addProyecto(10, proyecto(tipoId));
    }

    const detalle = await service.findById(10);
    expect(detalle).toMatchObject({ aplicaProyectos: true, proyectosCount: 4 });
    expect(
      detalle.proyectosPorTipo.map(({ tipo, cantidad }) => [tipo, cantidad]),
    ).toEqual([
      ['Programa Académico', 1],
      ['Programa Interacción Social y Extensión Universitaria', 1],
      ['Programa Investigación', 2],
    ]);
    expect(detalle.proyectos[0]).toEqual({
      id: 100,
      tipoId: INTERACCION,
      tipo: 'Programa Interacción Social y Extensión Universitaria',
      detalle: `Detalle del tipo ${INTERACCION}`,
      unidades: [
        {
          id: 10,
          codigo: 'C10',
          sigla: 'S10',
          nombre: 'FACULTAD DE CIENCIAS SOCIALES - DECANATO',
        },
      ],
    });
    expect(db.proyectos()[3].tipoProyectoId).toBe(INVESTIGACION);
  });

  it('rechaza un tipo inexistente o inactivo sin guardar nada', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expectBusiness(
      service.addProyecto(10, proyecto(999)),
      ErrorCodes.TIPO_PROYECTO_NO_EXISTE,
    );
    await expectBusiness(
      service.update(12, dto({ proyectos: [proyecto(INACTIVO)] })),
      ErrorCodes.TIPO_PROYECTO_NO_EXISTE,
    );
    expect(db.proyectos()).toEqual([]);
    expect(db.vinculos()).toEqual([]);
  });

  it('habilita vicedecanatos, carreras e institutos que dependen de un Decanato', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    for (const id of [11, 12, 13]) {
      await service.addProyecto(id, proyecto(INVESTIGACION));
      expect(await service.listProyectos(id)).toHaveLength(1);
    }
  });

  it('rechaza proyectos en el nivel central y no los muestra', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expectBusiness(
      service.addProyecto(1, proyecto(ACADEMICO)),
      ErrorCodes.PROYECTOS_NO_APLICA,
    );
    await expectBusiness(
      service.update(2, dto({ proyectos: [proyecto(ACADEMICO)] })),
      ErrorCodes.PROYECTOS_NO_APLICA,
    );
    await expect(service.update(2, dto({ proyectos: [] }))).resolves.toBe(2);
    expect(await service.listProyectos(1)).toEqual([]);
    expect(await service.findById(1)).toMatchObject({
      aplicaProyectos: false,
      proyectosCount: 0,
      proyectos: [],
      proyectosPorTipo: [],
    });
    expect(db.proyectos()).toEqual([]);
  });

  it('un proyecto conjunto suma en el contador de cada unidad participante', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const conjunto = await service.addProyecto(
      21,
      proyecto(INVESTIGACION, 'Química computacional', {
        unidadIds: [22, 21, 22],
      }),
    );
    expect(conjunto.unidades.map((u) => u.id)).toEqual([21, 22]);

    const lista = await service.lista();
    const contador = (id: number) =>
      lista.find((u) => u.id === id)?.proyectosCount;
    expect([contador(21), contador(22), contador(20), contador(1)]).toEqual([
      1, 1, 0, 0,
    ]);
    expect(lista.find((u) => u.id === 1)?.aplicaProyectos).toBe(false);
    expect(lista.find((u) => u.id === 20)?.aplicaProyectos).toBe(true);

    const quimica = await service.findById(22);
    expect(quimica.proyectos[0].unidades.map((u) => u.id)).toEqual([21, 22]);
  });

  it('rechaza participantes del nivel central o inexistentes sin guardar nada', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expectBusiness(
      service.addProyecto(21, proyecto(ACADEMICO, 'x', { unidadIds: [2] })),
      ErrorCodes.PROYECTO_UNIDAD_NO_APLICA,
    );
    await expectBusiness(
      service.addProyecto(21, proyecto(ACADEMICO, 'x', { unidadIds: [999] })),
      ErrorCodes.PROYECTO_UNIDAD_NO_APLICA,
    );
    expect(db.proyectos()).toEqual([]);
    expect(db.vinculos()).toEqual([]);
  });

  it('quitar un proyecto conjunto lo desvincula y lo da de baja con la última unidad', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const { id } = await service.addProyecto(
      21,
      proyecto(INVESTIGACION, 'x', { unidadIds: [22] }),
    );

    await service.removeProyecto(21, id);
    expect(await service.listProyectos(21)).toEqual([]);
    expect(await service.listProyectos(22)).toHaveLength(1);
    expect(db.proyectos()).toHaveLength(1);

    await service.removeProyecto(22, id);
    expect(db.proyectos()).toEqual([]);
    expect((await service.tiposProyecto()).every((t) => t.cantidad === 0)).toBe(
      true,
    );
  });

  it('un proyecto en el que la unidad no participa responde 404', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const { id } = await service.addProyecto(21, proyecto(ACADEMICO));
    await expectBusiness(service.getProyecto(22, id), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.updateProyecto(22, id, proyecto(INTERACCION)),
      ErrorCodes.NOT_FOUND,
    );
    await expectBusiness(service.removeProyecto(22, id), ErrorCodes.NOT_FOUND);
  });

  it('updateProyecto conserva los participantes si se omite unidadIds y los reemplaza si se envía', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const { id } = await service.addProyecto(
      21,
      proyecto(INVESTIGACION, 'x', { unidadIds: [22] }),
    );

    const editado = await service.updateProyecto(
      21,
      id,
      proyecto(INTERACCION, 'nuevo detalle'),
    );
    expect(editado).toMatchObject({
      tipoId: INTERACCION,
      tipo: 'Programa Interacción Social y Extensión Universitaria',
      detalle: 'nuevo detalle',
    });
    expect(editado.unidades.map((u) => u.id)).toEqual([21, 22]);

    const solo = await service.updateProyecto(
      22,
      id,
      proyecto(INTERACCION, 'nuevo detalle', { unidadIds: [] }),
    );
    expect(solo.unidades.map((u) => u.id)).toEqual([22]);
    expect(await service.listProyectos(21)).toEqual([]);
  });

  describe('sincronización desde el formulario (PUT /unidades/:id)', () => {
    it('crea, actualiza y desvincula los omitidos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.update(
        12,
        dto({ proyectos: [proyecto(ACADEMICO), proyecto(INVESTIGACION)] }),
      );
      const [a, b] = await service.listProyectos(12);

      await service.update(
        12,
        dto({
          proyectos: [
            { id: a.id, tipoId: INTERACCION, detalle: 'editado' },
            proyecto(INTERACCION),
          ],
        }),
      );
      expect(
        (await service.listProyectos(12)).map((p) => [
          p.id,
          p.tipoId,
          p.detalle,
        ]),
      ).toEqual([
        [a.id, INTERACCION, 'editado'],
        [102, INTERACCION, `Detalle del tipo ${INTERACCION}`],
      ]);
      // El omitido quedó sin unidades: baja lógica.
      expect(db.proyectos().map((p) => Number(p.id))).not.toContain(b.id);
    });

    it('omitir el campo no modifica los proyectos y [] los desvincula todos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.update(12, dto({ proyectos: [proyecto(ACADEMICO)] }));
      await service.update(12, dto({ nombre: 'Otro nombre' }));
      expect(await service.listProyectos(12)).toHaveLength(1);

      await service.update(12, dto({ proyectos: [] }));
      expect(await service.listProyectos(12)).toEqual([]);
    });

    it('omitir un proyecto conjunto solo quita a la unidad que lo omite', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.addProyecto(
        21,
        proyecto(INVESTIGACION, 'x', { unidadIds: [22] }),
      );
      await service.update(21, dto({ proyectos: [] }));
      expect(await service.listProyectos(21)).toEqual([]);
      expect(await service.listProyectos(22)).toHaveLength(1);
    });

    it('rechaza ids ajenos o repetidos y revierte toda la operación', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const ajeno = await service.addProyecto(22, proyecto(ACADEMICO));
      const propio = await service.addProyecto(21, proyecto(INVESTIGACION));
      const antes = { proyectos: db.proyectos(), vinculos: db.vinculos() };

      await expectBusiness(
        service.update(
          21,
          dto({
            proyectos: [{ id: ajeno.id, tipoId: ACADEMICO, detalle: 'x' }],
          }),
        ),
        ErrorCodes.PROYECTO_NO_PERTENECE_UNIDAD,
      );
      await expectBusiness(
        service.update(
          21,
          dto({
            proyectos: [
              { id: propio.id, tipoId: ACADEMICO, detalle: 'x' },
              { id: propio.id, tipoId: ACADEMICO, detalle: 'y' },
            ],
          }),
        ),
        ErrorCodes.PROYECTO_ID_DUPLICADO,
      );
      await expectBusiness(
        service.update(
          21,
          dto({
            proyectos: [
              { id: propio.id, tipoId: INTERACCION, detalle: 'cambiado' },
              proyecto(ACADEMICO, 'x', { unidadIds: [1] }),
            ],
          }),
        ),
        ErrorCodes.PROYECTO_UNIDAD_NO_APLICA,
      );
      expect({ proyectos: db.proyectos(), vinculos: db.vinculos() }).toEqual(
        antes,
      );
    });

    it('valida con el padre final: una unidad movida bajo un Decanato puede guardar proyectos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.update(
        2,
        dto({ parentId: 10, proyectos: [proyecto(ACADEMICO)] }),
      );
      expect(await service.listProyectos(2)).toHaveLength(1);
    });

    it('si la unidad deja de depender de un Decanato, sus proyectos se ocultan y no cuentan', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.addProyecto(12, proyecto(ACADEMICO));
      await service.update(12, dto({ parentId: 1 }));

      expect(await service.findById(12)).toMatchObject({
        aplicaProyectos: false,
        proyectosCount: 0,
        proyectos: [],
      });
      const lista = await service.lista();
      expect(lista.find((u) => u.id === 12)?.proyectosCount).toBe(0);
      expect(db.proyectos()).toHaveLength(1);
    });
  });

  it('en el alta valida con la clase y el padre enviados', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const base = {
      codigo: 'NUEVA',
      nombre: 'Laboratorio',
      tipo: 1,
      nivel: 1,
      relacion: 1,
    };
    await service.create(
      dto({
        ...base,
        tipoUnidad: 29,
        parentId: 12,
        proyectos: [proyecto(INVESTIGACION)],
      }),
    );
    expect(await service.listProyectos(50)).toHaveLength(1);

    await expectBusiness(
      service.create(
        dto({
          ...base,
          codigo: 'OTRA',
          tipoUnidad: 22,
          parentId: 1,
          proyectos: [proyecto(ACADEMICO)],
        }),
      ),
      ErrorCodes.PROYECTOS_NO_APLICA,
    );
  });

  it('tiposProyecto devuelve el catálogo activo en orden de alta con sus conteos', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await service.addProyecto(10, proyecto(ACADEMICO));
    await service.addProyecto(12, proyecto(INVESTIGACION));
    await service.addProyecto(13, proyecto(INVESTIGACION));
    expect(await service.tiposProyecto()).toEqual([
      { id: ACADEMICO, tipo: 'Programa Académico', cantidad: 1 },
      { id: INVESTIGACION, tipo: 'Programa Investigación', cantidad: 2 },
      {
        id: INTERACCION,
        tipo: 'Programa Interacción Social y Extensión Universitaria',
        cantidad: 0,
      },
    ]);
  });

  describe('crearTipoProyecto', () => {
    it('agrega un tipo nuevo al final del catálogo y se puede usar', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const nuevo = await service.crearTipoProyecto({
        tipo: '  Programa   de Posgrado ',
      });
      expect(nuevo).toEqual({
        id: 5,
        tipo: 'Programa de Posgrado',
        cantidad: 0,
      });

      await service.addProyecto(10, proyecto(nuevo.id));
      const tipos = await service.tiposProyecto();
      expect(tipos.at(-1)).toEqual({
        id: 5,
        tipo: 'Programa de Posgrado',
        cantidad: 1,
      });
    });

    it('no duplica un tipo que solo difiere en mayúsculas o acentos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const mismo = await service.crearTipoProyecto({
        tipo: 'programa investigacion',
      });
      expect(mismo).toMatchObject({
        id: INVESTIGACION,
        tipo: 'Programa Investigación',
      });
      expect(db.tipos()).toHaveLength(TIPOS.length);
    });

    it('reactiva un tipo inactivo equivalente en lugar de crear otro', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const reactivado = await service.crearTipoProyecto({
        tipo: 'PROGRAMA ANTIGUO',
      });
      expect(reactivado.id).toBe(INACTIVO);
      expect(db.tipos().find((t) => t.id === INACTIVO)?.activo).toBe(true);
      expect(db.tipos()).toHaveLength(TIPOS.length);
    });
  });
});
