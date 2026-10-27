import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { MofConfig } from './entities/mof-config.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { UnidadDto } from './dto/unidad.dto';
import { UpdateMofConfigDto } from './dto/mof-config.dto';
import {
  MOF_CONFIG_FALLBACK,
  UnidadesService,
  colorPropioFinal,
} from './unidades.service';
import { BusinessException } from '../../common/exceptions/business.exception';

type Fila = Partial<Unidad> & { id: string };

const CLASES: Record<number, Partial<TipoUnidad>> = {
  24: { id: 24, descripcion: 'DECANATOS', color: '#C62828' },
  25: { id: 25, descripcion: 'SECCIONES', color: '#E91E63' },
  26: { id: 26, descripcion: 'SIN COLOR', color: null },
};

/** Tablas `unidad` y `mof_config` en memoria: `findOne` entrega copias y solo `save` persiste. */
function createFakeDb(seed: Fila[] = [], config: Partial<MofConfig> | null) {
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
      if (!row) return Promise.resolve(null);
      return Promise.resolve({
        ...row,
        tipoUnidad: CLASES[Number(row.tipoUnidadId)] as TipoUnidad,
      });
    }),
    find: jest.fn(() =>
      Promise.resolve(
        [...rows.values()].map((r) => ({
          ...r,
          tipoUnidad: CLASES[Number(r.tipoUnidadId)] as TipoUnidad,
        })),
      ),
    ),
    create: jest.fn((data: object) => ({ ...data })),
    manager: {
      transaction: jest.fn((cb: (mgr: typeof m) => Promise<unknown>) => cb(m)),
    },
  };
  const configState = { row: config ? { id: 1, ...config } : null };
  const mofConfigRepo = {
    findOne: jest.fn(() =>
      Promise.resolve(configState.row ? { ...configState.row } : null),
    ),
    create: jest.fn((data: object) => ({ ...data })),
    save: jest.fn((x: Partial<MofConfig>) => {
      configState.row = { id: 1, ...x };
      return Promise.resolve(x);
    }),
  };
  return { rows, unidadRepo, mofConfigRepo, configState };
}

function buildService(db: ReturnType<typeof createFakeDb>) {
  const vacio = { find: jest.fn(() => Promise.resolve([])) };
  const catalogoRepo = { findOne: jest.fn(() => Promise.resolve({ id: 1 })) };
  const claseRepo = {
    findOne: jest.fn((opts: { where: { id: number } }) =>
      Promise.resolve(CLASES[Number(opts.where.id)] ?? null),
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
    db.mofConfigRepo as unknown as Repository<MofConfig>,
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
    tipoUnidad: 24,
    ...extra,
  });

const seed = (extra: Partial<Unidad> = {}): Fila => ({
  id: '10',
  codigo: '1.0',
  nombre: 'Unidad existente',
  tipoUnidadId: 24,
  color: '#00897B',
  ...extra,
});

describe('colorPropioFinal', () => {
  it.each([
    [null, '#C62828', null],
    ['', '#C62828', null],
    ['  ', '#C62828', null],
    ['#00897b', '#C62828', '#00897B'],
    ['#c62828', '#C62828', null],
    ['#C62828', '#c62828', null],
    ['#00897B', null, '#00897B'],
  ])('(%p, clase %p) → %p', (color, clase, esperado) => {
    expect(colorPropioFinal(color, clase)).toBe(esperado);
  });
});

describe('UnidadesService color propio (POST /unidades)', () => {
  it('sin color la unidad hereda de la Clase', async () => {
    const db = createFakeDb([], null);
    await buildService(db).create(alta({}));
    expect(db.rows.get('50')?.color).toBeNull();
  });

  it('guarda el color propio en mayúsculas', async () => {
    const db = createFakeDb([], null);
    await buildService(db).create(alta({ color: '#00897b' }));
    expect(db.rows.get('50')?.color).toBe('#00897B');
  });

  it('un color igual al de la Clase se guarda como null', async () => {
    const db = createFakeDb([], null);
    await buildService(db).create(alta({ color: '#c62828' }));
    expect(db.rows.get('50')?.color).toBeNull();
  });
});

describe('UnidadesService color propio (PUT /unidades/:id)', () => {
  it('un PUT sin color lo conserva', async () => {
    const db = createFakeDb([seed()], null);
    await buildService(db).update(10, dto({ nombre: 'Otro nombre' }));
    expect(db.rows.get('10')?.color).toBe('#00897B');
  });

  it('null vuelve a heredar de la Clase', async () => {
    const db = createFakeDb([seed()], null);
    await buildService(db).update(10, dto({ color: null }));
    expect(db.rows.get('10')?.color).toBeNull();
  });

  it('reemplaza el color propio', async () => {
    const db = createFakeDb([seed()], null);
    await buildService(db).update(10, dto({ color: '#1a237e' }));
    expect(db.rows.get('10')?.color).toBe('#1A237E');
  });

  it('se compara con la Clase final cuando el PUT la cambia', async () => {
    const db = createFakeDb([seed()], null);
    await buildService(db).update(
      10,
      dto({ tipoUnidad: 25, color: '#E91E63' }),
    );
    expect(db.rows.get('10')).toMatchObject({ tipoUnidadId: 25, color: null });
  });

  it('cambiar a una Clase del mismo color que el propio lo limpia', async () => {
    const db = createFakeDb([seed({ color: '#E91E63' })], null);
    await buildService(db).update(10, dto({ tipoUnidad: 25 }));
    expect(db.rows.get('10')?.color).toBeNull();
  });

  it('cambiar de Clase conserva un color propio distinto', async () => {
    const db = createFakeDb([seed()], null);
    await buildService(db).update(10, dto({ tipoUnidad: 25 }));
    expect(db.rows.get('10')?.color).toBe('#00897B');
  });
});

describe('UnidadesService colores en lecturas', () => {
  it('lista: color efectivo = propio o, si no hay, el de la Clase', async () => {
    const db = createFakeDb(
      [
        seed(),
        seed({ id: '11', codigo: '1.1', color: null }),
        seed({ id: '12', codigo: '1.2', color: null, tipoUnidadId: 26 }),
      ],
      null,
    );
    const lista = await buildService(db).lista();
    const porId = new Map(lista.map((u) => [u.id, u]));

    expect(porId.get(10)).toMatchObject({
      color: '#00897B',
      colorPropio: '#00897B',
      colorClase: '#C62828',
    });
    expect(porId.get(11)).toMatchObject({
      color: '#C62828',
      colorPropio: null,
      colorClase: '#C62828',
    });
    expect(porId.get(12)).toMatchObject({
      color: null,
      colorPropio: null,
      colorClase: null,
    });
  });

  it('detalle: devuelve las tres propiedades de color', async () => {
    const db = createFakeDb([seed()], null);
    expect(await buildService(db).findById(10)).toMatchObject({
      color: '#00897B',
      colorPropio: '#00897B',
      colorClase: '#C62828',
    });
  });
});

describe('UnidadesService paletaNodos (GET/PUT /mof/config)', () => {
  it('sin fila de configuración devuelve la paleta de nodos histórica', async () => {
    const db = createFakeDb([], null);
    const config = await buildService(db).getConfig();
    expect(config.paletaNodos).toEqual(MOF_CONFIG_FALLBACK.paletaNodos);
  });

  it('una paleta de nodos vacía cae a la histórica', async () => {
    const db = createFakeDb([], { paletaNodos: [] });
    const config = await buildService(db).getConfig();
    expect(config.paletaNodos).toEqual(MOF_CONFIG_FALLBACK.paletaNodos);
  });

  it('reemplaza la paleta de nodos en mayúsculas y la devuelve', async () => {
    const db = createFakeDb([], { ...MOF_CONFIG_FALLBACK });
    const service = buildService(db);
    const out = await service.updateConfig({
      paletaNodos: ['#ff0000', '#00FF00'],
    });
    expect(out.paletaNodos).toEqual(['#FF0000', '#00FF00']);
    expect((await service.getConfig()).paletaNodos).toEqual([
      '#FF0000',
      '#00FF00',
    ]);
    expect(out.paleta).toEqual(MOF_CONFIG_FALLBACK.paleta);
  });

  it('rechaza un swatch de paleta que no es hexadecimal', async () => {
    const db = createFakeDb([], { ...MOF_CONFIG_FALLBACK });
    await expect(
      buildService(db).updateConfig({ paleta: [['#1976D2', 'foo']] }),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(db.mofConfigRepo.save).not.toHaveBeenCalled();
  });
});

describe('Validación de colores en los DTO', () => {
  const erroresUnidad = async (color: unknown) =>
    (await validate(plainToInstance(UnidadDto, alta({ color } as never))))
      .filter((e) => e.property === 'color')
      .map((e) => e.property);

  it.each(['#00897B', '#00897b', null, ''])('color %p es válido', async (c) => {
    expect(await erroresUnidad(c)).toEqual([]);
  });

  it.each(['#12345', '#1234567', '#ABC', 'rojo', '#GGGGGG'])(
    'color %p es inválido',
    async (c) => {
      expect(await erroresUnidad(c)).toEqual(['color']);
    },
  );

  it('color vacío se transforma en null', () => {
    expect(plainToInstance(UnidadDto, alta({ color: '' })).color).toBeNull();
  });

  const erroresConfig = async (paletaNodos: unknown) =>
    (await validate(plainToInstance(UpdateMofConfigDto, { paletaNodos }))).map(
      (e) => e.property,
    );

  it('paletaNodos válida', async () => {
    expect(await erroresConfig(['#1D4ED8', '#b91c1c'])).toEqual([]);
  });

  it.each([
    ['con un color inválido', ['#1D4ED8', 'rojo']],
    ['vacía', []],
    ['con más de 24 colores', Array.from({ length: 25 }, () => '#1D4ED8')],
    ['que no es lista', '#1D4ED8'],
  ])('paletaNodos %s es inválida', async (_c, valor) => {
    expect(await erroresConfig(valor)).toEqual(['paletaNodos']);
  });
});
