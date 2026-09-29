import { toMppPersonal } from './mpp-personal.mapper';

describe('toMppPersonal', () => {
  it('maps cargoId, nombre and descripcion to the MPP shape', () => {
    expect(
      toMppPersonal([
        { cargoId: 7, nombre: 'JEFE DE UNIDAD', descripcion: 'Responsable' },
      ]),
    ).toEqual([
      { id: 7, descripcion: 'JEFE DE UNIDAD', detalle: 'Responsable' },
    ]);
  });

  it('uses an empty detalle when descripcion is null', () => {
    expect(
      toMppPersonal([{ cargoId: 3, nombre: 'SECRETARIA', descripcion: null }]),
    ).toEqual([{ id: 3, descripcion: 'SECRETARIA', detalle: '' }]);
  });

  it('returns one entry per cargo when it has several assignments', () => {
    const result = toMppPersonal([
      { cargoId: 5, nombre: 'TECNICO', descripcion: null },
      { cargoId: 9, nombre: 'AUXILIAR', descripcion: null },
      { cargoId: 5, nombre: 'TECNICO', descripcion: null },
    ]);
    expect(result.map((p) => p.id)).toEqual([5, 9]);
  });

  it('returns an empty list for a unit without assignments', () => {
    expect(toMppPersonal([])).toEqual([]);
  });
});
