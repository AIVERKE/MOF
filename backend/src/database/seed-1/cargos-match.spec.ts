import {
  buildCodigo,
  buildMatchAliases,
  dedupeRows,
  normalizeCargoName,
  pickBestMatch,
  CargoDatasetRow,
} from './cargos-match';

describe('cargos-match', () => {
  describe('normalizeCargoName', () => {
    it('strips accents and collapses spaces', () => {
      expect(normalizeCargoName('  JEFE DE DIVISIÓN  ')).toBe('JEFE DE DIVISION');
      expect(normalizeCargoName('SECRETARIO/A ACADÉMICO')).toBe(
        'SECRETARIO A ACADEMICO',
      );
    });
  });

  describe('buildMatchAliases', () => {
    it('maps Excel names to existing UMSA aliases', () => {
      const aliases = buildMatchAliases('RECTORA');
      expect(aliases).toEqual(
        expect.arrayContaining(['RECTORA', 'RECTOR/A']),
      );
    });

    it('maps JEDE/DIRECTOR DE CARRERA via normalized key', () => {
      const aliases = buildMatchAliases('JEDE/DIRECTOR DE CARRERA');
      expect(aliases).toEqual(
        expect.arrayContaining([
          'JEDE/DIRECTOR DE CARRERA',
          'DIRECTOR/A DE CARRERA',
        ]),
      );
    });
  });

  describe('buildCodigo', () => {
    it('includes nivel for ADM and not for ACAD', () => {
      expect(buildCodigo('ADM', 'RECTORA', 26)).toBe('ADM-26-RECTORA');
      expect(buildCodigo('ACAD', 'DECANO', null)).toBe('ACAD-DECANO');
    });
  });

  describe('pickBestMatch', () => {
    it('prefers activo then lower id', () => {
      const best = pickBestMatch([
        { id: '14', activo: false },
        { id: '13', activo: true },
        { id: '20', activo: true },
      ]);
      expect(best?.id).toBe('13');
    });
  });

  describe('dedupeRows', () => {
    it('keeps same name at different levels as distinct', () => {
      const rows: CargoDatasetRow[] = [
        {
          codigo: 'ADM-20-RESPONSABLE-U-D-I',
          nombre: 'RESPONSABLE U.D.I.',
          ambito: 'ADM',
          nivelOrden: 20,
          matchAliases: ['RESPONSABLE U.D.I.'],
        },
        {
          codigo: 'ADM-18-RESPONSABLE-U-D-I',
          nombre: 'RESPONSABLE U.D.I.',
          ambito: 'ADM',
          nivelOrden: 18,
          matchAliases: ['RESPONSABLE U.D.I.'],
        },
        {
          codigo: 'ADM-12-MECANICO-AUTOMOTRIZ-I',
          nombre: 'MECANICO AUTOMOTRIZ I',
          ambito: 'ADM',
          nivelOrden: 12,
          matchAliases: ['MECANICO AUTOMOTRIZ I'],
        },
        {
          codigo: 'ADM-12-MECANICO-AUTOMOTRIZ-I-DUP',
          nombre: 'MECANICO AUTOMOTRIZ I',
          ambito: 'ADM',
          nivelOrden: 12,
          matchAliases: ['MECANICO AUTOMOTRIZ I'],
        },
      ];
      const out = dedupeRows(rows);
      expect(out).toHaveLength(3);
      expect(out.map((r) => r.nivelOrden)).toEqual([20, 18, 12]);
    });
  });
});
