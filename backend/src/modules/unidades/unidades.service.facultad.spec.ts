import { Unidad } from './entities/unidad.entity';
import { UnidadesService } from './unidades.service';

type Nodo = { id: string; nombre: string; parentId: string | null };

/** Servicio con solo el repositorio de unidades, sobre un árbol en memoria. */
function buildService(nodos: Nodo[]) {
  const byId = new Map(nodos.map((n) => [n.id, n]));
  const unidadRepo = {
    findOne: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(byId.get(where.id) ?? null),
    ),
  };
  const service = Object.create(UnidadesService.prototype) as UnidadesService;
  Object.assign(service, { unidadRepo });
  const facultad = (id: string) =>
    (
      service as unknown as {
        facultadDeUnidad(u: Unidad): Promise<string>;
      }
    ).facultadDeUnidad(byId.get(id) as unknown as Unidad);
  return { facultad, unidadRepo };
}

describe('UnidadesService.facultadDeUnidad (encabezado del PDF)', () => {
  const arbol: Nodo[] = [
    { id: '44', nombre: 'VICERRECTORADO', parentId: null },
    {
      id: '70',
      nombre:
        'FMENTM - FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA - DECANATO',
      parentId: '44',
    },
    {
      id: '222',
      nombre: 'FMENTM - DEC - UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
      parentId: '70',
    },
    { id: '80', nombre: 'FMENTM - VICEDECANATO', parentId: '70' },
    {
      id: '228',
      nombre: 'FMENTM - VICE - DIRECCIÓN DE CARRERA DE MEDICINA',
      parentId: '80',
    },
    {
      id: '151',
      nombre: 'DIRECCIÓN ADMINISTRATIVA FINANCIERA',
      parentId: null,
    },
    { id: '1', nombre: 'CICLO A', parentId: '2' },
    { id: '2', nombre: 'CICLO B', parentId: '1' },
  ];

  it('toma la facultad del nombre del propio Decanato', async () => {
    await expect(buildService(arbol).facultad('70')).resolves.toBe(
      'FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA',
    );
  });

  it('sube por parent_id hasta el Decanato', async () => {
    const { facultad } = buildService(arbol);
    await expect(facultad('222')).resolves.toBe(
      'FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA',
    );
    await expect(facultad('228')).resolves.toBe(
      'FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA',
    );
  });

  it('sin facultad en la cadena es Administración Central', async () => {
    const { facultad } = buildService(arbol);
    await expect(facultad('151')).resolves.toBe('ADMINISTRACIÓN CENTRAL');
    await expect(facultad('44')).resolves.toBe('ADMINISTRACIÓN CENTRAL');
  });

  it('corta un ciclo de parent_id', async () => {
    const { facultad, unidadRepo } = buildService(arbol);
    await expect(facultad('1')).resolves.toBe('ADMINISTRACIÓN CENTRAL');
    expect(unidadRepo.findOne).toHaveBeenCalledTimes(1);
  });
});
