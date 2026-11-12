import { FindOperator, Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { Programa } from './entities/programa.entity';
import { ProgramaUnidad } from './entities/programa-unidad.entity';
import { TipoPrograma } from './entities/tipo-programa.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { ProgramaDto, UnidadDto } from './dto/unidad.dto';
import {
  UnidadesService,
  agruparProgramasPorTipo,
  aplicanProgramas,
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

type FilaPrograma = {
  id?: string;
  tipoProgramaId: number;
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
type Vinculo = { programaId: string; unidadId: string };

const valores = (v: unknown): string[] =>
  v instanceof FindOperator ? (v.value as unknown[]).map(String) : [String(v)];

/** Tablas `unidad`, `tipo_programa`, `programa` y `programa_unidad` en memoria; la transacción revierte si falla. */
function createFakeDb(
  seed: { programas?: FilaPrograma[]; vinculos?: Vinculo[] } = {},
) {
  const unidades = new Map(UNIDADES.map((u) => [u.id, { ...u }]));
  let programas: FilaPrograma[] = (seed.programas ?? []).map((p) => ({
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
  const vigentes = () => programas.filter((p) => !p.deletedAt);
  const conUnidades = (p: FilaPrograma) => ({
    ...p,
    tipoPrograma: tipos.find((t) => t.id === p.tipoProgramaId) ?? null,
    unidades: vinculos
      .filter((v) => v.programaId === p.id)
      .map((v) => ({ ...v, unidad: unidades.get(v.unidadId) ?? null })),
  });

  const m = {
    find: jest.fn(
      (entity: unknown, opts: { where: Record<string, unknown> }) => {
        const w = opts.where;
        if (entity === ProgramaUnidad) {
          return Promise.resolve(
            vinculos.filter(
              (v) =>
                (w.unidadId === undefined ||
                  valores(w.unidadId).includes(v.unidadId)) &&
                (w.programaId === undefined ||
                  valores(w.programaId).includes(v.programaId)),
            ),
          );
        }
        const ids = valores(w.id);
        return Promise.resolve(vigentes().filter((p) => ids.includes(p.id!)));
      },
    ),
    create: jest.fn((_e: unknown, data: object) => ({ ...data })),
    save: jest.fn((x: FilaPrograma | FilaUnidad) => {
      if ('codigo' in x) {
        x.id ??= '50';
        unidades.set(x.id, { ...x });
        return Promise.resolve(x);
      }
      if (x.id == null) {
        x.id = String(nextId++);
        programas.push({ ...x, deletedAt: null });
      } else {
        const fila = programas.find((p) => p.id === x.id)!;
        fila.tipoProgramaId = x.tipoProgramaId;
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
            (w.programaId === undefined ||
              valores(w.programaId).includes(v.programaId))
          ),
      );
      return Promise.resolve();
    }),
    insert: jest.fn((_e: unknown, filas: Vinculo[]) => {
      vinculos.push(
        ...filas.map((f) => ({
          programaId: String(f.programaId),
          unidadId: String(f.unidadId),
        })),
      );
      return Promise.resolve();
    }),
    softDelete: jest.fn((_e: unknown, w: { id: unknown }) => {
      const ids = valores(w.id);
      programas
        .filter((p) => ids.includes(p.id!))
        .forEach((p) => (p.deletedAt = new Date()));
      return Promise.resolve();
    }),
  };

  const transaction = jest.fn(
    async (cb: (mgr: typeof m) => Promise<unknown>) => {
      const snapshot = {
        programas: programas.map((p) => ({ ...p })),
        vinculos: vinculos.map((v) => ({ ...v })),
        unidades: [...unidades.values()].map((u) => ({ ...u })),
      };
      try {
        return await cb(m);
      } catch (e) {
        programas = snapshot.programas;
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

  const programaRepo = {
    find: jest.fn((opts: { where?: { id: unknown } }) => {
      const ids = opts.where ? valores(opts.where.id) : null;
      return Promise.resolve(
        vigentes()
          .filter((p) => !ids || ids.includes(p.id!))
          .sort((a, b) => Number(a.id) - Number(b.id))
          .map(conUnidades),
      );
    }),
    count: jest.fn((opts: { where: { tipoProgramaId: number } }) =>
      Promise.resolve(
        vigentes().filter((p) => p.tipoProgramaId === opts.where.tipoProgramaId)
          .length,
      ),
    ),
    create: jest.fn((data: object) => ({ ...data })),
    manager: { transaction },
  };

  const tipoProgramaRepo = {
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

  const programaUnidadRepo = {
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
            v.programaId === opts.where.programaId &&
            v.unidadId === opts.where.unidadId,
        ) ?? null,
      ),
    ),
  };

  return {
    unidades,
    unidadRepo,
    programaRepo,
    programaUnidadRepo,
    tipoProgramaRepo,
    tipos: () => tipos.map((t) => ({ ...t })),
    programas: () =>
      vigentes().map(({ id, tipoProgramaId, detalle }) => ({
        id,
        tipoProgramaId,
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
    db.programaRepo as unknown as Repository<Programa>,
    db.programaUnidadRepo as unknown as Repository<ProgramaUnidad>,
    vacio as never,
    db.tipoProgramaRepo as unknown as Repository<TipoPrograma>,
  );
}

const dto = (extra: Partial<UnidadDto>) => extra as UnidadDto;
const programa = (
  tipoId: number,
  detalle = `Detalle del tipo ${tipoId}`,
  extra: Partial<ProgramaDto> = {},
): ProgramaDto => ({ tipoId, detalle, ...extra });

async function expectBusiness(p: Promise<unknown>, code: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BusinessException);
  expect((err as BusinessException).errorCode).toBe(code);
}

describe('aplicanProgramas', () => {
  it('habilita Decanatos y todas sus dependencias, no el nivel central', async () => {
    const db = createFakeDb();
    const rows = await db.unidadRepo.find();
    const aplican = aplicanProgramas(rows as unknown as Unidad[]);
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

describe('agruparProgramasPorTipo', () => {
  it('agrupa sin distinguir mayúsculas, acentos ni espacios y conserva la primera grafía', () => {
    const grupos = agruparProgramasPorTipo([
      { id: 1, tipo: 'Investigación' },
      { id: 2, tipo: 'Académico' },
      { id: 3, tipo: 'investigacion' },
      { id: 4, tipo: 'INVESTIGACIÓN  ' },
    ]);
    expect(grupos).toEqual([
      {
        tipo: 'Académico',
        cantidad: 1,
        programas: [{ id: 2, tipo: 'Académico' }],
      },
      {
        tipo: 'Investigación',
        cantidad: 3,
        programas: [
          { id: 1, tipo: 'Investigación' },
          { id: 3, tipo: 'investigacion' },
          { id: 4, tipo: 'INVESTIGACIÓN  ' },
        ],
      },
    ]);
  });
});

describe('UnidadesService - programas', () => {
  it('registra en un Decanato programas de los tres programas y los agrupa por tipo', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    for (const tipoId of [
      INTERACCION,
      ACADEMICO,
      INVESTIGACION,
      INVESTIGACION,
    ]) {
      await service.addPrograma(10, programa(tipoId));
    }

    const detalle = await service.findById(10);
    expect(detalle).toMatchObject({ aplicaProgramas: true, programasCount: 4 });
    expect(
      detalle.programasPorTipo.map(({ tipo, cantidad }) => [tipo, cantidad]),
    ).toEqual([
      ['Programa Académico', 1],
      ['Programa Interacción Social y Extensión Universitaria', 1],
      ['Programa Investigación', 2],
    ]);
    expect(detalle.programas[0]).toEqual({
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
    expect(db.programas()[3].tipoProgramaId).toBe(INVESTIGACION);
  });

  it('rechaza un tipo inexistente o inactivo sin guardar nada', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expectBusiness(
      service.addPrograma(10, programa(999)),
      ErrorCodes.TIPO_PROGRAMA_NO_EXISTE,
    );
    await expectBusiness(
      service.update(12, dto({ programas: [programa(INACTIVO)] })),
      ErrorCodes.TIPO_PROGRAMA_NO_EXISTE,
    );
    expect(db.programas()).toEqual([]);
    expect(db.vinculos()).toEqual([]);
  });

  it('habilita vicedecanatos, carreras e institutos que dependen de un Decanato', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    for (const id of [11, 12, 13]) {
      await service.addPrograma(id, programa(INVESTIGACION));
      expect(await service.listProgramas(id)).toHaveLength(1);
    }
  });

  it('rechaza programas en el nivel central y no los muestra', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expectBusiness(
      service.addPrograma(1, programa(ACADEMICO)),
      ErrorCodes.PROGRAMAS_NO_APLICA,
    );
    await expectBusiness(
      service.update(2, dto({ programas: [programa(ACADEMICO)] })),
      ErrorCodes.PROGRAMAS_NO_APLICA,
    );
    await expect(service.update(2, dto({ programas: [] }))).resolves.toBe(2);
    expect(await service.listProgramas(1)).toEqual([]);
    expect(await service.findById(1)).toMatchObject({
      aplicaProgramas: false,
      programasCount: 0,
      programas: [],
      programasPorTipo: [],
    });
    expect(db.programas()).toEqual([]);
  });

  it('un programa conjunto suma en el contador de cada unidad participante', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const conjunto = await service.addPrograma(
      21,
      programa(INVESTIGACION, 'Química computacional', {
        unidadIds: [22, 21, 22],
      }),
    );
    expect(conjunto.unidades.map((u) => u.id)).toEqual([21, 22]);

    const lista = await service.lista();
    const contador = (id: number) =>
      lista.find((u) => u.id === id)?.programasCount;
    expect([contador(21), contador(22), contador(20), contador(1)]).toEqual([
      1, 1, 0, 0,
    ]);
    expect(lista.find((u) => u.id === 1)?.aplicaProgramas).toBe(false);
    expect(lista.find((u) => u.id === 20)?.aplicaProgramas).toBe(true);

    const quimica = await service.findById(22);
    expect(quimica.programas[0].unidades.map((u) => u.id)).toEqual([21, 22]);
  });

  it('rechaza participantes del nivel central o inexistentes sin guardar nada', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await expectBusiness(
      service.addPrograma(21, programa(ACADEMICO, 'x', { unidadIds: [2] })),
      ErrorCodes.PROGRAMA_UNIDAD_NO_APLICA,
    );
    await expectBusiness(
      service.addPrograma(21, programa(ACADEMICO, 'x', { unidadIds: [999] })),
      ErrorCodes.PROGRAMA_UNIDAD_NO_APLICA,
    );
    expect(db.programas()).toEqual([]);
    expect(db.vinculos()).toEqual([]);
  });

  it('quitar un programa conjunto lo desvincula y lo da de baja con la última unidad', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const { id } = await service.addPrograma(
      21,
      programa(INVESTIGACION, 'x', { unidadIds: [22] }),
    );

    await service.removePrograma(21, id);
    expect(await service.listProgramas(21)).toEqual([]);
    expect(await service.listProgramas(22)).toHaveLength(1);
    expect(db.programas()).toHaveLength(1);

    await service.removePrograma(22, id);
    expect(db.programas()).toEqual([]);
    expect((await service.tiposPrograma()).every((t) => t.cantidad === 0)).toBe(
      true,
    );
  });

  it('un programa en el que la unidad no participa responde 404', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const { id } = await service.addPrograma(21, programa(ACADEMICO));
    await expectBusiness(service.getPrograma(22, id), ErrorCodes.NOT_FOUND);
    await expectBusiness(
      service.updatePrograma(22, id, programa(INTERACCION)),
      ErrorCodes.NOT_FOUND,
    );
    await expectBusiness(service.removePrograma(22, id), ErrorCodes.NOT_FOUND);
  });

  it('updatePrograma conserva los participantes si se omite unidadIds y los reemplaza si se envía', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    const { id } = await service.addPrograma(
      21,
      programa(INVESTIGACION, 'x', { unidadIds: [22] }),
    );

    const editado = await service.updatePrograma(
      21,
      id,
      programa(INTERACCION, 'nuevo detalle'),
    );
    expect(editado).toMatchObject({
      tipoId: INTERACCION,
      tipo: 'Programa Interacción Social y Extensión Universitaria',
      detalle: 'nuevo detalle',
    });
    expect(editado.unidades.map((u) => u.id)).toEqual([21, 22]);

    const solo = await service.updatePrograma(
      22,
      id,
      programa(INTERACCION, 'nuevo detalle', { unidadIds: [] }),
    );
    expect(solo.unidades.map((u) => u.id)).toEqual([22]);
    expect(await service.listProgramas(21)).toEqual([]);
  });

  describe('sincronización desde el formulario (PUT /unidades/:id)', () => {
    it('crea, actualiza y desvincula los omitidos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.update(
        12,
        dto({ programas: [programa(ACADEMICO), programa(INVESTIGACION)] }),
      );
      const [a, b] = await service.listProgramas(12);

      await service.update(
        12,
        dto({
          programas: [
            { id: a.id, tipoId: INTERACCION, detalle: 'editado' },
            programa(INTERACCION),
          ],
        }),
      );
      expect(
        (await service.listProgramas(12)).map((p) => [
          p.id,
          p.tipoId,
          p.detalle,
        ]),
      ).toEqual([
        [a.id, INTERACCION, 'editado'],
        [102, INTERACCION, `Detalle del tipo ${INTERACCION}`],
      ]);
      // El omitido quedó sin unidades: baja lógica.
      expect(db.programas().map((p) => Number(p.id))).not.toContain(b.id);
    });

    it('omitir el campo no modifica los programas y [] los desvincula todos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.update(12, dto({ programas: [programa(ACADEMICO)] }));
      await service.update(12, dto({ nombre: 'Otro nombre' }));
      expect(await service.listProgramas(12)).toHaveLength(1);

      await service.update(12, dto({ programas: [] }));
      expect(await service.listProgramas(12)).toEqual([]);
    });

    it('omitir un programa conjunto solo quita a la unidad que lo omite', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.addPrograma(
        21,
        programa(INVESTIGACION, 'x', { unidadIds: [22] }),
      );
      await service.update(21, dto({ programas: [] }));
      expect(await service.listProgramas(21)).toEqual([]);
      expect(await service.listProgramas(22)).toHaveLength(1);
    });

    it('rechaza ids ajenos o repetidos y revierte toda la operación', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const ajeno = await service.addPrograma(22, programa(ACADEMICO));
      const propio = await service.addPrograma(21, programa(INVESTIGACION));
      const antes = { programas: db.programas(), vinculos: db.vinculos() };

      await expectBusiness(
        service.update(
          21,
          dto({
            programas: [{ id: ajeno.id, tipoId: ACADEMICO, detalle: 'x' }],
          }),
        ),
        ErrorCodes.PROGRAMA_NO_PERTENECE_UNIDAD,
      );
      await expectBusiness(
        service.update(
          21,
          dto({
            programas: [
              { id: propio.id, tipoId: ACADEMICO, detalle: 'x' },
              { id: propio.id, tipoId: ACADEMICO, detalle: 'y' },
            ],
          }),
        ),
        ErrorCodes.PROGRAMA_ID_DUPLICADO,
      );
      await expectBusiness(
        service.update(
          21,
          dto({
            programas: [
              { id: propio.id, tipoId: INTERACCION, detalle: 'cambiado' },
              programa(ACADEMICO, 'x', { unidadIds: [1] }),
            ],
          }),
        ),
        ErrorCodes.PROGRAMA_UNIDAD_NO_APLICA,
      );
      expect({ programas: db.programas(), vinculos: db.vinculos() }).toEqual(
        antes,
      );
    });

    it('valida con el padre final: una unidad movida bajo un Decanato puede guardar programas', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.update(
        2,
        dto({ parentId: 10, programas: [programa(ACADEMICO)] }),
      );
      expect(await service.listProgramas(2)).toHaveLength(1);
    });

    it('si la unidad deja de depender de un Decanato, sus programas se ocultan y no cuentan', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      await service.addPrograma(12, programa(ACADEMICO));
      await service.update(12, dto({ parentId: 1 }));

      expect(await service.findById(12)).toMatchObject({
        aplicaProgramas: false,
        programasCount: 0,
        programas: [],
      });
      const lista = await service.lista();
      expect(lista.find((u) => u.id === 12)?.programasCount).toBe(0);
      expect(db.programas()).toHaveLength(1);
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
        programas: [programa(INVESTIGACION)],
      }),
    );
    expect(await service.listProgramas(50)).toHaveLength(1);

    await expectBusiness(
      service.create(
        dto({
          ...base,
          codigo: 'OTRA',
          tipoUnidad: 22,
          parentId: 1,
          programas: [programa(ACADEMICO)],
        }),
      ),
      ErrorCodes.PROGRAMAS_NO_APLICA,
    );
  });

  it('tiposPrograma devuelve el catálogo activo en orden de alta con sus conteos', async () => {
    const db = createFakeDb();
    const service = buildService(db);
    await service.addPrograma(10, programa(ACADEMICO));
    await service.addPrograma(12, programa(INVESTIGACION));
    await service.addPrograma(13, programa(INVESTIGACION));
    expect(await service.tiposPrograma()).toEqual([
      { id: ACADEMICO, tipo: 'Programa Académico', cantidad: 1 },
      { id: INVESTIGACION, tipo: 'Programa Investigación', cantidad: 2 },
      {
        id: INTERACCION,
        tipo: 'Programa Interacción Social y Extensión Universitaria',
        cantidad: 0,
      },
    ]);
  });

  describe('crearTipoPrograma', () => {
    it('agrega un tipo nuevo al final del catálogo y se puede usar', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const nuevo = await service.crearTipoPrograma({
        tipo: '  Programa   de Posgrado ',
      });
      expect(nuevo).toEqual({
        id: 5,
        tipo: 'Programa de Posgrado',
        cantidad: 0,
      });

      await service.addPrograma(10, programa(nuevo.id));
      const tipos = await service.tiposPrograma();
      expect(tipos.at(-1)).toEqual({
        id: 5,
        tipo: 'Programa de Posgrado',
        cantidad: 1,
      });
    });

    it('no duplica un tipo que solo difiere en mayúsculas o acentos', async () => {
      const db = createFakeDb();
      const service = buildService(db);
      const mismo = await service.crearTipoPrograma({
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
      const reactivado = await service.crearTipoPrograma({
        tipo: 'PROGRAMA ANTIGUO',
      });
      expect(reactivado.id).toBe(INACTIVO);
      expect(db.tipos().find((t) => t.id === INACTIVO)?.activo).toBe(true);
      expect(db.tipos()).toHaveLength(TIPOS.length);
    });
  });
});
