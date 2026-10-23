import { esClaseCarrera } from './clase-carrera';

describe('esClaseCarrera', () => {
  it('reconoce la clase de carreras', () => {
    expect(esClaseCarrera('DIRECCIONES DE CARRERA')).toBe(true);
  });

  it('ignora mayúsculas y acentos', () => {
    expect(esClaseCarrera('Dirección de Cárrera')).toBe(true);
  });

  it('rechaza otras clases', () => {
    expect(esClaseCarrera('DECANATOS')).toBe(false);
    expect(esClaseCarrera('DIRECCIONES DE INSTITUTOS')).toBe(false);
  });

  it('rechaza valores vacíos', () => {
    expect(esClaseCarrera(null)).toBe(false);
    expect(esClaseCarrera(undefined)).toBe(false);
    expect(esClaseCarrera('')).toBe(false);
  });
});
