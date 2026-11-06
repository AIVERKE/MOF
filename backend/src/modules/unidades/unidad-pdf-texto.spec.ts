import {
  facultadDesdeNombre,
  nivelMof,
  nombreCorto,
  nombreUnidadMof,
  nombresUnidadesMof,
  tipoUnidadMof,
  tituloEs,
} from './unidad-pdf-texto';

describe('unidad-pdf-texto', () => {
  describe('nombreCorto', () => {
    it.each([
      [
        'FMENTM - FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA - DECANATO',
        'DECANATO',
      ],
      [
        'FMENTM - DEC - UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
        'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
      ],
      ['FACULTAD DE CIENCIAS SOCIALES - DECANATO', 'DECANATO'],
      ['FACULTAD DE DERECHO Y CIENCIAS POLÍTICAS-DECANATO', 'DECANATO'],
      [
        'FCPN-CARR-INSTITUTO DE BIOLOGÍA MOLECULAR Y BIOTECNOLOGÍA',
        'INSTITUTO DE BIOLOGÍA MOLECULAR Y BIOTECNOLOGÍA',
      ],
      [
        'FO.DEC-UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
        'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
      ],
      [
        'FHCE-VICE-DIRECCIÓN DE CARRERA – FILOSOFÍA',
        'DIRECCIÓN DE CARRERA – FILOSOFÍA',
      ],
      ['FCG-VICEDECANATO', 'VICEDECANATO'],
    ])('quita los prefijos de "%s"', (nombre, esperado) => {
      expect(nombreCorto(nombre)).toBe(esperado);
    });

    it.each([
      'DIRECCIÓN ADMINISTRATIVA FINANCIERA',
      'DIRECCIÓN DE CARRERA- INGENIERÍA ELÉCTRICA',
      'INSTITUTO DE ELECTRÓNICA APLICADA - IEA',
      'INSTITUTO BOLIVIANO DE BIOLOGÍA DE ALTURA (IBBA)',
    ])('no toca un nombre sin prefijos: "%s"', (nombre) => {
      expect(nombreCorto(nombre)).toBe(nombre);
    });

    it('colapsa espacios y tolera vacíos', () => {
      expect(nombreCorto('CENTRO  DE  SEGUIMIENTO')).toBe(
        'CENTRO DE SEGUIMIENTO',
      );
      expect(nombreCorto(null)).toBe('');
      expect(nombreCorto('FCPN-')).toBe('FCPN-');
    });
  });

  describe('tituloEs', () => {
    it.each([
      ['DECANATO', 'Decanato'],
      [
        'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
        'Unidad de Administración Desconcentrada',
      ],
      [
        'INSTITUTO DE BIOLOGÍA MOLECULAR Y BIOTECNOLOGÍA',
        'Instituto de Biología Molecular y Biotecnología',
      ],
      [
        'INSTITUTO BOLIVIANO DE BIOLOGÍA DE ALTURA (IBBA)',
        'Instituto Boliviano de Biología de Altura (IBBA)',
      ],
      [
        'INSTITUTO DE ELECTRÓNICA APLICADA - IEA',
        'Instituto de Electrónica Aplicada - IEA',
      ],
      [
        'PLANETARIO UNIVERSITARIO "DR. MAX SCHEREIER"',
        'Planetario Universitario "Dr. Max Schereier"',
      ],
      ['SUSTANTIVO (ACADÉMICO)', 'Sustantivo (Académico)'],
      [
        'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA - ADMINISTRACIÓN CENTRAL (TVU –DANA-IDR.DU)',
        'Unidad de Administración Desconcentrada - Administración Central (TVU –DANA-IDR.DU)',
      ],
      ['DE LA UMSA', 'De la UMSA'],
    ])('"%s" → "%s"', (texto, esperado) => {
      expect(tituloEs(texto)).toBe(esperado);
    });

    it('respeta un texto que ya trae minúsculas', () => {
      expect(tituloEs('Sustantivo (Académico)')).toBe('Sustantivo (Académico)');
      expect(tituloEs('Ejecutivo')).toBe('Ejecutivo');
    });
  });

  describe('nivelMof (E. Nivel jerárquico)', () => {
    it.each([
      ['Ejecutivo Estratégico Facultativo', 'Ejecutivo'],
      ['Ejecutivo Estratégico Institucional', 'Ejecutivo'],
      ['Ejecutivo Operativo', 'Ejecutivo'],
      ['Ejecutivo', 'Ejecutivo'],
      ['Operativo', 'Operativo'],
      ['Directorio', 'Directorio'],
      ['OPERATIVO', 'Operativo'],
      ['  Ejecutivo   Estratégico ', 'Ejecutivo'],
      [null, ''],
      ['', ''],
    ])('%p → %p', (nivel, esperado) => {
      expect(nivelMof(nivel)).toBe(esperado);
    });
  });

  describe('tipoUnidadMof (F. Tipo de unidad)', () => {
    it.each([
      ['Sustantivo (Académico)', 'Sustantivo'],
      ['Sustantivo', 'Sustantivo'],
      ['Administrativa', 'Administrativa'],
      ['Asesoramiento', 'Asesoramiento'],
      ['SUSTANTIVO (ACADÉMICO)', 'Sustantivo'],
      [null, ''],
    ])('%p → %p', (tipo, esperado) => {
      expect(tipoUnidadMof(tipo)).toBe(esperado);
    });
  });

  describe('facultadDesdeNombre', () => {
    it.each([
      [
        'FMENTM - FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA - DECANATO',
        'FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA',
      ],
      [
        'FACULTAD DE HUMANIDADES Y CIENCIAS DE LA EDUCACIÓN-DECANATO',
        'FACULTAD DE HUMANIDADES Y CIENCIAS DE LA EDUCACIÓN',
      ],
      [
        'FACULTAD DE ARQUITECTURA, ARTES, DISEÑO Y URBANISMO - DECANATO',
        'FACULTAD DE ARQUITECTURA, ARTES, DISEÑO Y URBANISMO',
      ],
      ['Facultad de Ingeniería', 'FACULTAD DE INGENIERÍA'],
    ])('extrae la facultad de "%s"', (nombre, esperado) => {
      expect(facultadDesdeNombre(nombre)).toBe(esperado);
    });

    it('devuelve null si el nombre no menciona una facultad', () => {
      expect(facultadDesdeNombre('FCG-VICEDECANATO')).toBeNull();
      expect(
        facultadDesdeNombre('DIRECCIÓN ADMINISTRATIVA FINANCIERA'),
      ).toBeNull();
      expect(facultadDesdeNombre(null)).toBeNull();
    });
  });

  describe('nombresUnidadesMof', () => {
    it('agrega la sigla del prefijo solo a los nombres que se repiten', () => {
      expect(
        nombresUnidadesMof([
          'FMENTM - DEC - UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
          'FCPN-DEC-UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
          'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
          'FCG-VICEDECANATO',
          null,
        ]),
      ).toEqual([
        'Unidad de Administración Desconcentrada (FMENTM)',
        'Unidad de Administración Desconcentrada (FCPN)',
        'Unidad de Administración Desconcentrada',
        'Vicedecanato',
      ]);
    });
  });

  it('nombreUnidadMof combina ambas reglas', () => {
    expect(
      nombreUnidadMof('FMENTM - DEC - UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA'),
    ).toBe('Unidad de Administración Desconcentrada');
  });
});
