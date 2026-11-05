import { UnidadesService } from './unidades.service';

type Hija = { id: number; nombre: string };

/** Servicio con solo `unidadRepo.query`, que devuelve los descendientes lineales. */
function buildService(descendientes: number[]) {
  const unidadRepo = {
    query: jest.fn(() =>
      Promise.resolve(descendientes.map((id) => ({ id: String(id) }))),
    ),
  };
  const service = Object.create(UnidadesService.prototype) as UnidadesService;
  Object.assign(service, { unidadRepo });
  const filtrar = (id: number, hijas: Hija[]) =>
    (
      service as unknown as {
        hijasFuncionalesMof(id: number, hijas: Hija[]): Promise<Hija[]>;
      }
    ).hijasFuncionalesMof(id, hijas);
  return { filtrar, unidadRepo };
}

describe('UnidadesService.hijasFuncionalesMof (J. del PDF)', () => {
  // Decanato de Medicina (70) en la base: dependientes funcionales registrados.
  const funcionalesDecanato: Hija[] = [
    { id: 221, nombre: 'CENTRO DE SEGUIMIENTO Y GESTIÓN DE LA CALIDAD' },
    { id: 80, nombre: 'VICEDECANATO' },
    { id: 230, nombre: 'INSTITUTO DE INVESTIGACIÓN … EN ENFERMERÍA' },
    { id: 235, nombre: 'INSTITUTO DE INVESTIGACIÓN … EN NUTRICIÓN' },
    { id: 238, nombre: 'INSTITUTO DE INVESTIGACIÓN … EN TECNOLOGÍA MEDICA' },
  ];
  // Hijas (221, 80, 222), nietas (las Carreras) y bisnietas (los Institutos).
  const descendientesDecanato = [221, 80, 222, 229, 232, 236, 230, 235, 238];

  it('quita hijas y descendientes lineales: el Decanato queda sin J, como su MOF', async () => {
    const { filtrar, unidadRepo } = buildService(descendientesDecanato);
    await expect(filtrar(70, funcionalesDecanato)).resolves.toEqual([]);
    expect(unidadRepo.query).toHaveBeenCalledWith(
      expect.stringContaining('WITH RECURSIVE'),
      ['70'],
    );
  });

  it('conserva las dependencias funcionales de otra rama (DAF ← UAD de facultades)', async () => {
    const uadFacultad = {
      id: 222,
      nombre: 'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
    };
    const { filtrar } = buildService([152, 153]);
    await expect(filtrar(151, [uadFacultad])).resolves.toEqual([uadFacultad]);
  });

  it('sin dependientes funcionales no consulta la base', async () => {
    const { filtrar, unidadRepo } = buildService([]);
    await expect(filtrar(70, [])).resolves.toEqual([]);
    expect(unidadRepo.query).not.toHaveBeenCalled();
  });
});
