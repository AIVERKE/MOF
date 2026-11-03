import {
  consolidarRelacionamientoInterno,
  normalizarCoordinacionesInternas,
  resumirRelacionesInternas,
  UnidadUniverso,
} from './relaciones-internas-resumen';

const ADM = { tipoId: 1, tipoNombre: 'Administrativo' };
const SUS = { tipoId: 2, tipoNombre: 'Sustantivo (Académico)' };
const CARRERA = { claseId: 28, claseNombre: 'DIRECCIONES DE CARRERA' };
const DIVISION = { claseId: 23, claseNombre: 'DIVISIONES' };
const RECTORADO = { claseId: 1, claseNombre: 'RECTORADO' };

const universo: UnidadUniverso[] = [
  { id: 1, ...RECTORADO, ...SUS },
  { id: 10, ...CARRERA, ...SUS },
  { id: 11, ...CARRERA, ...SUS },
  { id: 12, ...CARRERA, ...SUS },
  { id: 13, ...CARRERA, ...SUS },
  { id: 20, ...DIVISION, ...ADM },
  { id: 21, ...DIVISION, ...ADM },
  { id: 22, ...DIVISION, ...ADM },
  { id: 99, ...DIVISION, ...SUS },
];

const rel = (ids: number[]) =>
  ids.map((id) => ({ relacionadaId: id, nombre: `UNIDAD ${id}`, sigla: null }));

describe('resumirRelacionesInternas', () => {
  it('resume una instancia completa y lista el resto', () => {
    const result = resumirRelacionesInternas(
      rel([10, 11, 12, 13, 20]),
      universo,
      500,
    );

    expect(result).toEqual([
      { nombre: 'TODAS LAS DIRECCIONES DE CARRERA (4)' },
      { nombre: 'UNIDAD 20', sigla: null },
    ]);
  });

  it('lista unidad por unidad un grupo parcial', () => {
    const result = resumirRelacionesInternas(rel([10, 11, 12]), universo, 500);

    expect(result.map((r) => r.nombre)).toEqual([
      'UNIDAD 10',
      'UNIDAD 11',
      'UNIDAD 12',
    ]);
  });

  it('un tipo completo tiene prioridad y no repite sus instancias', () => {
    const result = resumirRelacionesInternas(rel([20, 21, 22]), universo, 500);

    expect(result).toEqual([
      { nombre: 'TODAS LAS UNIDADES DE TIPO ADMINISTRATIVO (3)' },
    ]);
  });

  it('una instancia con unidades de otro tipo solo se resume si está completa', () => {
    const parcial = resumirRelacionesInternas(rel([20, 21, 22]), universo, 500);
    expect(parcial.map((r) => r.nombre)).not.toContain(
      'TODAS LAS DIVISIONES (4)',
    );

    const completa = resumirRelacionesInternas(
      rel([20, 21, 22, 99]),
      universo,
      500,
    );
    expect(completa.map((r) => r.nombre)).toEqual([
      'TODAS LAS UNIDADES DE TIPO ADMINISTRATIVO (3)',
      'TODAS LAS DIVISIONES (4)',
    ]);
  });

  it('no resume grupos de menos de 3 unidades', () => {
    const result = resumirRelacionesInternas(rel([1]), universo, 500);

    expect(result).toEqual([{ nombre: 'UNIDAD 1', sigla: null }]);
  });

  it('excluye la propia unidad del grupo', () => {
    const result = resumirRelacionesInternas(rel([11, 12, 13]), universo, 10);

    expect(result).toEqual([
      { nombre: 'TODAS LAS DIRECCIONES DE CARRERA (3)' },
    ]);
  });
});

describe('consolidarRelacionamientoInterno', () => {
  it('numera de forma continua: primero los textos y luego las unidades', () => {
    const result = consolidarRelacionamientoInterno(
      [
        { id: 1, descripcion: 'Unidades Organizacionales de la Facultad' },
        { id: 2, descripcion: 'Departamento de Planificación y Coordinación' },
      ],
      [
        {
          id: 7,
          relacionadaId: 20,
          codigo: '1.2',
          nombre: 'Carrera de Informática',
          sigla: 'INF',
          tipo: null,
        },
      ],
    );

    expect(result).toEqual([
      {
        orden: 1,
        origen: 'TEXTO',
        id: 1,
        descripcion: 'Unidades Organizacionales de la Facultad',
      },
      {
        orden: 2,
        origen: 'TEXTO',
        id: 2,
        descripcion: 'Departamento de Planificación y Coordinación',
      },
      {
        orden: 3,
        origen: 'UNIDAD',
        id: 7,
        descripcion: 'Carrera de Informática',
        relacionadaId: 20,
        codigo: '1.2',
        sigla: 'INF',
        tipo: null,
      },
    ]);
  });

  it('funciona con solo unidades o sin nada', () => {
    expect(consolidarRelacionamientoInterno([], [])).toEqual([]);
    const soloUnidades = consolidarRelacionamientoInterno(
      [],
      [{ id: 3, relacionadaId: 30, nombre: 'Decanato' }],
    );
    expect(soloUnidades.map((r) => [r.orden, r.origen])).toEqual([
      [1, 'UNIDAD'],
    ]);
  });
});

describe('normalizarCoordinacionesInternas', () => {
  it('acepta strings u objetos, recorta y descarta vacíos, repetidos y no-textos', () => {
    expect(
      normalizarCoordinacionesInternas([
        ' A  b ',
        { descripcion: 'C' },
        'A b',
        '',
        null,
        42,
        { descripcion: '  ' },
      ]),
    ).toEqual(['A b', 'C']);
  });
});
