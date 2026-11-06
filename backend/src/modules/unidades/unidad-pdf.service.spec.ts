import { join } from 'path';
import PDFDocument from 'pdfkit';
import { UnidadPdfDetail, UnidadPdfService } from './unidad-pdf.service';

const dipgisLike: UnidadPdfDetail = {
  id: 999,
  codigo: '1.2.3',
  nombre: 'Dirección de Investigación, Postgrado e Interacción Social',
  sigla: 'DIPGIS',
  nivel: 'Dirección',
  tipo: 'Sustantiva',
  objetivo:
    'Coordinar la investigación\r\n\tcientífica y la interacción social.',
  funciones: [
    { funcion: 'Planificar → ejecutar', baseLegal: 'Estatuto ≥ 2020' },
  ],
  relacionesInternas: Array.from({ length: 30 }, (_, i) => ({
    nombre: `Facultad de Ciencias y Tecnología número ${i + 1}`,
    sigla: `FCT${i + 1}`,
  })),
  coordinacionesInternas: [
    { descripcion: 'Unidades Organizacionales de la Facultad' },
    { descripcion: 'Departamento de Planificación\ny Coordinación' },
  ],
  relacionesExternas: Array.from({ length: 13 }, (_, i) => ({
    descripcion:
      i === 0
        ? 'Ministerio de Educación\u200B – Viceministerio de Ciencia y Tecnología'
        : i === 1
          ? 'Cooperación Sueca (ASDI)\n- Programa de investigación\n- Becas de postgrado'
          : `${i + 1}. Gobierno Autónomo Municipal, convenio\uF0B7 n° ${i + 1} → año ${2010 + i}`,
  })),
};

/** Unidad de Administración Desconcentrada del Decanato de FMENTM (seed). */
const uadFmentm: UnidadPdfDetail = {
  id: 222,
  codigo: '1.1.0.0.0.0.18.10.0.0.0.0.0.0',
  nombre: 'FMENTM - DEC - UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA',
  sigla: '1.1.0.0.0.0.18.10.0.0.0.0.0.0',
  nivel: 'Operativo',
  tipo: 'Administrativo',
  resCreacion: 'HCU Nº 122/1993',
  fecCreacion: '2023-07-29',
  facultad: 'FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA',
  objetivo:
    'ELABORAR, PROCESAR Y EMITIR INFORMACIÓN CONTABLE INTEGRADA ECONÓMICA-FINANCIERA Y NO FINANCIERA DE LA FACULTAD, DE CONFORMIDAD CON LAS NORMAS Y PRINCIPIOS CONTABLES.',
  parent: {
    id: 70,
    nombre:
      'FMENTM - FACULTAD DE MEDICINA, ENFERMERÍA, NUTRICIÓN Y TECNOLOGÍA MÉDICA - DECANATO',
  },
  dependenciasFuncionales: [
    { id: 151, nombre: 'DIRECCIÓN ADMINISTRATIVA FINANCIERA' },
  ],
  funciones: Array.from({ length: 24 }, (_, i) => ({
    funcion: `${i + 1}. Coordinar y procesar las contrataciones de bienes y servicios de las Unidades solicitantes, en el marco del Reglamento Específico del Sistema de Administración de Bienes y Servicios (función ${i + 1}).`,
    baseLegal: i % 2 ? 'Ley 1178 (SAFCO)' : 'Normas Básicas del SABS',
  })),
  relacionesInternas: [
    { nombre: 'DIRECCIÓN ADMINISTRATIVA FINANCIERA' },
    { nombre: 'DEPARTAMENTO DE ASESORÍA JURÍDICA' },
  ],
  relacionesExternas: [
    { descripcion: 'Empresas proveedoras de bienes y Servicios' },
  ],
};

/** Dirección Administrativa Financiera: 8 hijas y base legal larga. */
const daf: UnidadPdfDetail = {
  id: 151,
  codigo: '1.0.0.1.0.0.0.0.0.0.0.0.0.0',
  nombre: 'DIRECCIÓN ADMINISTRATIVA FINANCIERA',
  nivel: 'Ejecutivo',
  tipo: 'Administrativo',
  resCreacion: '1er. Congreso',
  fecCreacion: '1988-10-31',
  baseLegal: [
    'NORMAS BASICAS',
    '• Ley de administración y control gubernamentales (SAFCO)',
    ...Array.from({ length: 40 }, (_, i) => `• Reglamento Interno ${i + 1}`),
  ].join('\n'),
  hijasLineales: [
    'DEPARTAMENTO DE CONTABILIDAD',
    'DEPARTAMENTO DE PRESUPUESTO Y PLANIFICACIÓN FINANCIERA',
    'DEPARTAMENTO DE TESORO UNIVERSITARIO',
    'DIVISIÓN DE ADQUISICIONES',
    'DIVISIÓN DE BIENES E INVENTARIOS',
    'SECCIÓN TÉCNICA DE OPERACIONES TRIBUTARIAS',
    'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA - ADMINISTRACIÓN CENTRAL (TVU –DANA-IDR.DU)',
    'UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA - ADMINISTRACIÓN CENTRAL (CEPIES)',
    'SECCIÓN EXTRA',
  ].map((nombre) => ({ nombre })),
};

const pageCount = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;

describe('UnidadPdfService', () => {
  const service = new UnidadPdfService();
  const clean = (v: string) => service['clean'](v);

  describe('clean', () => {
    it('recomposes decomposed accents (NFD → NFC)', () => {
      expect(clean('Dire\u0301ccio\u0301n Espan\u0303a')).toBe(
        'Dirécción España',
      );
    });

    it('normalizes line endings, tabs, spaces and blank lines', () => {
      expect(clean('  uno\r\n\tdos  tres\r\r\r\ncuatro ')).toBe(
        'uno\ndos tres\n\ncuatro',
      );
    });

    it('strips zero-width and control characters', () => {
      expect(clean('A\u200BB\uFEFFC\u0007D\u00ADE')).toBe('ABCDE');
    });

    it('replaces symbols the font cannot draw', () => {
      // Arial y Liberation no traen ✓ ni la viñeta privada de Word (U+F0B7).
      expect(clean('a ✓ b \uF0B7 c ➢ d')).toBe('a - b • c • d');
    });

    it('keeps Spanish text and common punctuation intact', () => {
      const text = 'Año «Señal» – “Información” • 50 € ¿Sí? ¡No!';
      expect(clean(text)).toBe(text);
    });
  });

  describe('relacionamientoInterno (O, MOF-087)', () => {
    const items = (detail: Partial<UnidadPdfDetail>) =>
      service['relacionamientoInterno']({
        id: 1,
        codigo: '1',
        nombre: 'X',
        ...detail,
      });

    it('lista primero los textos libres y después las unidades vinculadas', () => {
      expect(
        items({
          coordinacionesInternas: [
            { descripcion: 'Unidades Organizacionales de la Facultad' },
          ],
          relacionesInternas: [
            { nombre: 'FCPN - CARRERA DE INFORMÁTICA', sigla: 'INF' },
            { nombre: 'TODAS LAS CARRERAS (12)' },
          ],
        }),
      ).toEqual([
        'Unidades Organizacionales de la Facultad',
        'Carrera de Informática',
        'Todas las Carreras (12)',
      ]);
    });

    it('sin nada registrado queda vacía (el PDF muestra "Ninguna.")', () => {
      expect(items({})).toEqual([]);
    });
  });

  describe('itemText', () => {
    const item = (v: string) => service['itemText'](v);

    it('quita el número o la viñeta que el ítem ya traía', () => {
      expect(item('3. Gobierno Autónomo')).toBe('Gobierno Autónomo');
      expect(item('12) Revisar')).toBe('Revisar');
      expect(item('- Becas')).toBe('Becas');
      expect(item('• Ley 1178')).toBe('Ley 1178');
    });

    it('conserva el texto y sus líneas siguientes', () => {
      expect(item('Cooperación\n- Programa')).toBe('Cooperación\n- Programa');
      expect(item('1178 es la ley')).toBe('1178 es la ley');
    });
  });

  describe('wrapLines', () => {
    /** Ancho máximo de un renglón: Word mide ~0.7 % más angosto (factor 0.993). */
    const maxWidth = (width: number) => (width + 0.05) / 0.993;
    const wrap = (text: string, width: number) => {
      const doc = new PDFDocument();
      doc.font('Helvetica').fontSize(11);
      return {
        doc,
        lines: service['wrapLines'](doc, text, width),
      };
    };

    it('corta por palabras sin perder texto ni pasarse del ancho', () => {
      const text = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(
        ' ',
      );
      const { doc, lines } = wrap(text, 200);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.map((l) => l.text).join(' ')).toBe(text);
      for (const l of lines) {
        expect(doc.widthOfString(l.text)).toBeLessThanOrEqual(maxWidth(200));
      }
      expect(lines.map((l) => l.end)).toEqual([
        ...lines.slice(1).map(() => false),
        true,
      ]);
    });

    it('como Word, no cuenta el espacio que sigue a la última palabra', () => {
      const doc = new PDFDocument();
      doc.font('Helvetica').fontSize(11);
      const width = doc.widthOfString('aaa bbb');
      const lines = service['wrapLines'](doc, 'aaa bbb ccc', width);
      expect(lines.map((l) => l.text)).toEqual(['aaa bbb', 'ccc']);
    });

    it('corta por caracteres una palabra más ancha que el renglón', () => {
      const word = 'x'.repeat(200);
      const { doc, lines } = wrap(word, 50);
      expect(lines.map((l) => l.text).join('')).toBe(word);
      for (const l of lines) {
        expect(doc.widthOfString(l.text)).toBeLessThanOrEqual(maxWidth(50));
      }
    });

    it('reproduce los cortes de Word del formato oficial (Arial 11)', () => {
      const doc = new PDFDocument();
      // Liberation Sans tiene las mismas medidas que Arial.
      doc
        .font(join(__dirname, '../../assets/fonts/LiberationSans-Regular.ttf'))
        .fontSize(11);
      const parrafo = [
        'Coordinar la formulación del Plan Operativo',
        'Anual y Presupuesto de la Facultad en el marco',
        'de los lineamientos y directrices aprobados y en',
        'observancia de las Normas Básicas del Sistema',
        'de Programación de Operaciones, de',
        'Presupuestos y Reglamento Específico de los',
        'Sistemas de Programación de Operaciones y de',
        'Presupuestos.',
      ];
      // Columna M: 279.8 − texto en 41.42 − margen 3.3.
      const lines = service['wrapLines'](doc, parrafo.join(' '), 235.08);
      expect(lines.map((l) => l.text)).toEqual(parrafo);

      const objetivo = [
        'Administrar los procesos de formación académica de grado y posgrado, investigación, interacción',
        'social, extensión universitaria y procesos administrativos, promoviendo el desarrollo hacia la',
        'excelencia, utilizándolos recursos de manera eficiente para asegurar el adecuado funcionamiento de la',
        'Facultad.',
      ];
      // Columna L: 508.4 − 2 × 3.3.
      const objLines = service['wrapLines'](doc, objetivo.join(' '), 501.8);
      expect(objLines.map((l) => l.text)).toEqual(objetivo);
    });

    it('respeta los saltos de párrafo y deja un renglón para el texto vacío', () => {
      expect(wrap('uno\ndos', 200).lines).toEqual([
        { text: 'uno', end: true },
        { text: 'dos', end: true },
      ]);
      expect(wrap('', 200).lines).toEqual([{ text: '', end: true }]);
    });
  });

  it('builds a DIPGIS-like PDF with Arial (or its metric clone Liberation Sans)', async () => {
    const pdf = await service.buildUnidadPdf(dipgisLike);
    const raw = pdf.toString('latin1');
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toMatch(/\+(Arial-BoldMT|LiberationSans-Bold)/);
    expect(raw).toMatch(/\+(Arial-ItalicMT|LiberationSans-Italic)/);
    expect(raw).toMatch(/\+(ArialMT|LiberationSans)\b/);
    expect(raw).not.toMatch(/NotoSans/);
    expect(raw).not.toMatch(/\/BaseFont \/Helvetica/);
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
  });

  it('sin Arial en el sistema usa Liberation Sans del repo', async () => {
    // Solo se buscan fuentes en assets/fonts: las carpetas del sistema quedan fuera.
    type Finder = (dirs: string[], names: string[]) => string | null;
    const proto = UnidadPdfService.prototype as unknown as {
      findFontFile: Finder;
    };
    const realFind = proto.findFontFile;
    const fontsDir = join('assets', 'fonts');
    const spy = jest.spyOn(proto, 'findFontFile').mockImplementation(function (
      this: unknown,
      dirs,
      names,
    ) {
      return realFind.call(
        this,
        dirs.filter((d) => d.includes(fontsDir)),
        names,
      );
    });
    try {
      const sinArial = new UnidadPdfService();
      const raw = (await sinArial.buildUnidadPdf(uadFmentm)).toString('latin1');
      expect(raw).toMatch(/\+LiberationSans\b/);
      expect(raw).toMatch(/\+LiberationSans-Bold/);
      expect(raw).toMatch(/\+LiberationSans-Italic/);
      expect(raw).not.toMatch(/Arial/);
      expect(sinArial['fonts'].narrowScale).toBe(82);
    } finally {
      spy.mockRestore();
    }
  });

  it('builds a PDF for a unit with a linear parent', async () => {
    const pdf = await service.buildUnidadPdf({
      ...dipgisLike,
      parent: { id: 1, nombre: 'Rectorado', sigla: 'REC' },
      dependenciasFuncionales: [
        { id: 1, nombre: 'Rectorado', sigla: 'REC' },
        { id: 2, nombre: 'Vicerrectorado', sigla: 'VR' },
      ],
    });
    expect(pdf.toString('latin1').startsWith('%PDF-')).toBe(true);
  });

  it('continúa las funciones en las páginas siguientes', async () => {
    const pdf = await service.buildUnidadPdf(uadFmentm);
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(2);
  });

  it('dibuja la DAF con 9 hijas y base legal larga', async () => {
    const pdf = await service.buildUnidadPdf(daf);
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(2);
  });

  it('genera una unidad sin datos opcionales', async () => {
    const pdf = await service.buildUnidadPdf({
      id: 1,
      codigo: '1',
      nombre: 'RECTORADO',
    });
    expect(pdf.toString('latin1').startsWith('%PDF-')).toBe(true);
    expect(pageCount(pdf)).toBe(1);
  });

  it('parte una función más larga que una página', async () => {
    const pdf = await service.buildUnidadPdf({
      ...uadFmentm,
      funciones: [{ funcion: 'Texto muy largo. '.repeat(900) }],
    });
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(3);
  });

  it('keeps the linear parent out of the functional dependencies', () => {
    const deps = service['dependenciasSinPadre']({
      ...dipgisLike,
      parent: { id: 1, nombre: 'Rectorado' },
      dependenciasFuncionales: [
        { id: 1, nombre: 'Rectorado' },
        { id: 2, nombre: 'Vicerrectorado' },
      ],
    });
    expect(deps.map((d) => d.id)).toEqual([2]);
  });
});
