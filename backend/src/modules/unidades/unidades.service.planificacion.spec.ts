import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { UnidadDto } from './dto/unidad.dto';
import { UnidadesService } from './unidades.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/errors';

type Fila = Partial<Unidad> & { id: string };

const CLASE = { id: 24, descripcion: 'DECANATOS' };

/** Tabla `unidad` en memoria: `findOne` entrega copias y solo `save` persiste. */
function createFakeDb(seed: Fila[] = []) {
  const rows = new Map<string, Fila>(seed.map((r) => [r.id, { ...r }]));
  const m = {
    save: jest.fn((x: Fila) => {
      x.id ??= '50';
      rows.set(x.id, { ...x });
      return Promise.resolve(x);
    }),
  };
  const unidadRepo = {
    findOne: jest.fn((opts: { where: { id?: string; codigo?: string } }) => {
      const { id, codigo } = opts.where;
      const row =
        id != null
          ? rows.get(id)
          : [...rows.values()].find((r) => r.codigo === codigo);
      return Promise.resolve(row ? { ...row } : null);
    }),
    find: jest.fn(() => Promise.resolve([])),
    create: jest.fn((data: object) => ({ ...data })),
    manager: {
      transaction: jest.fn((cb: (mgr: typeof m) => Promise<unknown>) => cb(m)),
    },
  };
  return { rows, unidadRepo };
}

function buildService(db: ReturnType<typeof createFakeDb>) {
  const vacio = { find: jest.fn(() => Promise.resolve([])) };
  const catalogoRepo = { findOne: jest.fn(() => Promise.resolve({ id: 1 })) };
  const claseRepo = { findOne: jest.fn(() => Promise.resolve(CLASE)) };
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
    vacio as never,
    vacio as never,
  );
}

const dto = (extra: Partial<UnidadDto>) => extra as UnidadDto;

const alta = (extra: Partial<UnidadDto>) =>
  dto({
    codigo: '1.1',
    sigla: 'UPE',
    nombre: 'Unidad de prueba',
    tipo: 1,
    nivel: 1,
    relacion: 1,
    oficial: true,
    tipoUnidad: CLASE.id,
    ...extra,
  });

async function expectBusiness(p: Promise<unknown>, code: string) {
  const err: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BusinessException);
  expect((err as BusinessException).errorCode).toBe(code);
}

const seed = (extra: Partial<Unidad> = {}): Fila => ({
  id: '10',
  codigo: '1.0',
  nombre: 'Unidad existente',
  tipoUnidadId: CLASE.id,
  tipoUnidad: CLASE as TipoUnidad,
  planificacionEstrategicaAplica: true,
  planificacionEstrategicaValor: 60,
  planificacionEstrategica: 'Plan vigente',
  ...extra,
});

describe('UnidadesService Planificación Estratégica (POST /unidades)', () => {
  it('sin el bloque, la unidad se crea con el switch apagado', async () => {
    const db = createFakeDb();
    await buildService(db).create(alta({}));
    expect(db.rows.get('50')).toMatchObject({
      planificacionEstrategicaAplica: false,
      planificacionEstrategicaValor: null,
      planificacionEstrategica: null,
    });
  });

  it('con el switch activo persiste porcentaje y descripción', async () => {
    const db = createFakeDb();
    await buildService(db).create(
      alta({
        planificacionEstrategicaAplica: true,
        planificacionEstrategicaValor: 75.5,
        planificacionEstrategica: '  Eje 2: gestión académica  ',
      }),
    );
    expect(db.rows.get('50')).toMatchObject({
      planificacionEstrategicaAplica: true,
      planificacionEstrategicaValor: 75.5,
      planificacionEstrategica: 'Eje 2: gestión académica',
    });
  });

  it.each([
    ['sin porcentaje', { planificacionEstrategica: 'Plan' }],
    ['sin descripción', { planificacionEstrategicaValor: 10 }],
    [
      'con descripción vacía',
      { planificacionEstrategicaValor: 10, planificacionEstrategica: '   ' },
    ],
  ])('con el switch activo y %s responde error', async (_c, extra) => {
    const db = createFakeDb();
    await expectBusiness(
      buildService(db).create(
        alta({ planificacionEstrategicaAplica: true, ...extra }),
      ),
      ErrorCodes.PLANIFICACION_ESTRATEGICA_INCOMPLETA,
    );
    expect(db.rows.size).toBe(0);
  });

  it('con el switch apagado no exige los campos', async () => {
    const db = createFakeDb();
    await buildService(db).create(
      alta({ planificacionEstrategicaAplica: false }),
    );
    expect(db.rows.get('50')?.planificacionEstrategicaAplica).toBe(false);
  });
});

describe('UnidadesService Planificación Estratégica (PUT y GET /unidades/:id)', () => {
  it('al apagar el switch conserva los valores pero el detalle no los expone', async () => {
    const db = createFakeDb([seed()]);
    const service = buildService(db);
    await service.update(10, dto({ planificacionEstrategicaAplica: false }));

    expect(db.rows.get('10')).toMatchObject({
      planificacionEstrategicaAplica: false,
      planificacionEstrategicaValor: 60,
      planificacionEstrategica: 'Plan vigente',
    });
    expect(await service.findById(10)).toMatchObject({
      planificacionEstrategicaAplica: false,
      planificacionEstrategicaValor: null,
      planificacionEstrategica: null,
    });
  });

  it('al reactivar el switch reaparecen los valores guardados', async () => {
    const db = createFakeDb([seed({ planificacionEstrategicaAplica: false })]);
    const service = buildService(db);
    await service.update(10, dto({ planificacionEstrategicaAplica: true }));

    expect(await service.findById(10)).toMatchObject({
      planificacionEstrategicaAplica: true,
      planificacionEstrategicaValor: 60,
      planificacionEstrategica: 'Plan vigente',
    });
  });

  it('un PUT sin el bloque no lo modifica', async () => {
    const db = createFakeDb([seed()]);
    await buildService(db).update(10, dto({ nombre: 'Otro nombre' }));
    expect(db.rows.get('10')).toMatchObject({
      planificacionEstrategicaAplica: true,
      planificacionEstrategicaValor: 60,
      planificacionEstrategica: 'Plan vigente',
    });
  });

  it('actualiza porcentaje y descripción con el switch activo', async () => {
    const db = createFakeDb([seed()]);
    await buildService(db).update(
      10,
      dto({
        planificacionEstrategicaValor: 0,
        planificacionEstrategica: 'Plan reformulado',
      }),
    );
    expect(db.rows.get('10')).toMatchObject({
      planificacionEstrategicaValor: 0,
      planificacionEstrategica: 'Plan reformulado',
    });
  });

  it('limpiar un campo con el switch activo responde error y no guarda', async () => {
    const db = createFakeDb([seed()]);
    await expectBusiness(
      buildService(db).update(10, dto({ planificacionEstrategicaValor: null })),
      ErrorCodes.PLANIFICACION_ESTRATEGICA_INCOMPLETA,
    );
    expect(db.rows.get('10')?.planificacionEstrategicaValor).toBe(60);
  });

  it('activar el switch sin valores guardados ni enviados responde error', async () => {
    const db = createFakeDb([
      seed({
        planificacionEstrategicaAplica: false,
        planificacionEstrategicaValor: null,
        planificacionEstrategica: null,
      }),
    ]);
    await expectBusiness(
      buildService(db).update(
        10,
        dto({ planificacionEstrategicaAplica: true }),
      ),
      ErrorCodes.PLANIFICACION_ESTRATEGICA_INCOMPLETA,
    );
  });
});

describe('UnidadDto Planificación Estratégica (ValidationPipe)', () => {
  const CAMPOS = [
    'planificacionEstrategicaAplica',
    'planificacionEstrategicaValor',
    'planificacionEstrategica',
  ];

  /** Mismas opciones que el `ValidationPipe` global de `main.ts`. */
  async function erroresDe(body: Record<string, unknown>) {
    const instance = plainToInstance(UnidadDto, body, {
      enableImplicitConversion: true,
    });
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return errors
      .filter((e) => CAMPOS.includes(e.property))
      .map((e) => e.property);
  }

  it.each([
    [{ planificacionEstrategicaValor: 0 }],
    [{ planificacionEstrategicaValor: 100 }],
    [{ planificacionEstrategicaValor: 12.34 }],
    [{ planificacionEstrategicaValor: null, planificacionEstrategica: null }],
    [{ planificacionEstrategicaAplica: true }],
  ])('acepta %j', async (body) => {
    expect(await erroresDe(body)).toEqual([]);
  });

  it.each([
    [{ planificacionEstrategicaValor: -0.01 }, 'planificacionEstrategicaValor'],
    [
      { planificacionEstrategicaValor: 100.01 },
      'planificacionEstrategicaValor',
    ],
    [{ planificacionEstrategicaValor: 1.234 }, 'planificacionEstrategicaValor'],
    [{ planificacionEstrategicaValor: 'abc' }, 'planificacionEstrategicaValor'],
    [{ planificacionEstrategica: 'Plan <b>' }, 'planificacionEstrategica'],
  ])('rechaza %j', async (body, campo) => {
    expect(await erroresDe(body)).toEqual([campo]);
  });
});
