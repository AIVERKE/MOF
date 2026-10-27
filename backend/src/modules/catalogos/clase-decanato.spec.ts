import { esClaseDecanato } from './clase-decanato';

describe('esClaseDecanato', () => {
  it('reconoce decanatos y vicedecanatos', () => {
    expect(esClaseDecanato('DECANATOS')).toBe(true);
    expect(esClaseDecanato('VICEDECANATOS')).toBe(true);
  });

  it('ignora mayúsculas y acentos', () => {
    expect(esClaseDecanato('Decanáto')).toBe(true);
  });

  it('rechaza otras clases', () => {
    expect(esClaseDecanato('RECTORADO')).toBe(false);
    expect(esClaseDecanato('VICERRECTORADO')).toBe(false);
    expect(esClaseDecanato('DIRECCIONES DE CARRERA')).toBe(false);
  });

  it('rechaza valores vacíos', () => {
    expect(esClaseDecanato(null)).toBe(false);
    expect(esClaseDecanato(undefined)).toBe(false);
    expect(esClaseDecanato('')).toBe(false);
  });
});
