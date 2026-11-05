import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import {
  ADMINISTRACION_CENTRAL,
  nombreCorto,
  nombreUnidadMof,
  nombresUnidadesMof,
  nivelMof,
  tipoUnidadMof,
} from './unidad-pdf-texto';

export type UnidadPdfDetail = {
  id: number;
  codigo: string;
  nombre: string;
  sigla?: string | null;
  tipo?: string | null;
  nivel?: string | null;
  resCreacion?: string | null;
  res_creacion?: string | null;
  fecCreacion?: Date | string | null;
  fec_creacion?: Date | string | null;
  objetivo?: string | null;
  baseLegal?: string | null;
  base_legal?: string | null;
  /** Segunda línea del encabezado: "FACULTAD DE …" o "ADMINISTRACIÓN CENTRAL". */
  facultad?: string | null;
  parent?: {
    id: number;
    codigo?: string;
    nombre?: string;
    sigla?: string;
  } | null;
  funciones?: { funcion: string; baseLegal?: string | null }[];
  dependenciasFuncionales?: {
    id?: number | null;
    nombre?: string | null;
    sigla?: string | null;
  }[];
  hijasLineales?: { nombre?: string | null; sigla?: string | null }[];
  hijasFuncionales?: { nombre?: string | null; sigla?: string | null }[];
  relacionesInternas?: { nombre?: string | null; sigla?: string | null }[];
  relacionesExternas?: { descripcion?: string | null }[];
};

/*
 * Todas las medidas salen de `FORMATO MOF.pdf` (Word 2016), en puntos y con
 * el origen arriba a la izquierda.
 */

/** Colores del formato oficial: tabla negra con títulos en gris. */
const COLOR = {
  border: '#000000',
  label: '#D9D9D9',
  text: '#000000',
  placeholder: '#BFBFBF',
  unidad: '#D9D9D9',
};

/** Hoja Carta: la tabla va de x = 64.8 a x = 573.2 (508.4 de ancho). */
const PAGE_MARGINS = { top: 57, bottom: 78, left: 64.8, right: 38.8 };
/** En la 1.ª página Word deja un renglón vacío antes del encabezado. */
const FIRST_PAGE_TOP = 70.5;

const FONT_SIZE = {
  title: 12,
  facultad: 11,
  label: 11,
  /** Títulos L, O y P. */
  labelSmall: 10,
  value: 11,
  resolucion: 8,
  version: 9,
  firma: 10,
  org: 5.5,
  orgUnidad: 6,
};
/** Margen de celda: el texto arranca 3.3 pt después del borde. */
const PAD_X = 3.3;
/** Word no deja margen vertical: una fila de un renglón (11 pt) mide ~13.1. */
const PAD_Y = 0.25;
const LINE_WIDTH = 0.5;
/** Alto mínimo que debe caber del bloque siguiente (un renglón) para no dejar un título huérfano. */
const MIN_FOLLOW = 13.1;
const NINGUNA = 'Ninguna.';

/** Anchos de columna, como en el formato. */
const WIDTH = {
  codigo: 148.3,
  logo: 61.8,
  identidad: 227.2,
  funciones: 279.8,
  coordinacionInterna: 227.2,
  firma: 241.7,
};

/** Encabezado: borde doble, alto mínimo, división de la celda derecha y margen del título. */
const HEADER = { minHeight: 55.6, split: 36, double: 1, padX: 5.4 };

/**
 * Word corta los renglones midiendo Arial con anchos de pantalla ~0.7 % más
 * angostos que los de la fuente. Con 0.993 se reproducen todos los cortes de
 * `FORMATO MOF.pdf` (cualquier valor entre 0.9925 y 0.9935 sirve; con 1.0
 * fallan dos párrafos).
 */
const WORD_WIDTH_FACTOR = 0.993;

/** Sangría de la 2.ª línea de los títulos O y P: Word la escribió con 5 espacios (13.9 pt en Bold 10). */
const LABEL_HANG_SPACES = '     ';

/** Bloque de firmas (Q/R/S/U). */
const FIRMA = {
  gap: 13.8,
  labelH: 12.8,
  padX: 2.5,
  /** La línea punteada empieza casi en el borde. */
  lineX: 1,
  dash: 2,
  dashSpace: 1,
};

/**
 * Cuerpo de cada fila de firmas: alto, posición de la línea punteada y de
 * "Nombre:"/"Cargo:" (o "FECHA:"), y cuánto antes del borde derecho termina
 * la línea en cada celda (en el formato no es igual en todas).
 */
const FIRMA_ROWS = {
  qr: {
    bodyH: 73.9,
    lineY: 42.2,
    nombreY: 49.2,
    cargoY: 61.4,
    lineEnd: [13, 27],
  },
  su: {
    bodyH: 63,
    lineY: 29.6,
    selloLineY: 38.4,
    nombreY: 37.2,
    cargoY: 49.5,
    lineEnd: [41, 29],
  },
};

/** Posición del número y del texto de cada lista, medida desde el borde izquierdo de la celda. */
type ListIndent = { markerX: number; textX: number };
const LIST: Record<
  'unidades' | 'funciones' | 'internas' | 'externas' | 'baseLegal',
  ListIndent
> = {
  unidades: { markerX: 16.22, textX: 34.22 },
  funciones: { markerX: 16.22, textX: 41.42 },
  internas: { markerX: 21.26, textX: 39.26 },
  externas: { markerX: 23.05, textX: 41.07 },
  baseLegal: { markerX: 4.5, textX: 18 },
};

type FontFace = 'regular' | 'bold' | 'italic' | 'narrowBold';

/**
 * Arial (la del formato) se busca primero en `assets/fonts` y en las carpetas
 * de fuentes del sistema. No se versiona: es de Microsoft.
 */
const ARIAL_FILES: Record<FontFace, string[]> = {
  regular: ['arial.ttf', 'Arial.ttf'],
  bold: ['arialbd.ttf', 'Arial_Bold.ttf', 'Arial Bold.ttf'],
  italic: ['ariali.ttf', 'Arial_Italic.ttf', 'Arial Italic.ttf'],
  narrowBold: ['ARIALNB.TTF', 'arialnb.ttf', 'Arial Narrow Bold.ttf'],
};

/** Liberation Sans (OFL, incluida en el repo): mismas medidas que Arial. */
const LIBERATION_FILES: Record<Exclude<FontFace, 'narrowBold'>, string> = {
  regular: 'LiberationSans-Regular.ttf',
  bold: 'LiberationSans-Bold.ttf',
  italic: 'LiberationSans-Italic.ttf',
};

/** Arial Narrow mide el 82 % de Arial: sin ella, se angosta la Bold. */
const NARROW_SCALE = 82;

const SYSTEM_FONT_DIRS = [
  join(process.env.WINDIR || 'C:\\Windows', 'Fonts'),
  '/usr/share/fonts/truetype/msttcorefonts',
  '/usr/share/fonts/msttcorefonts',
  '/usr/share/fonts/TTF',
  '/Library/Fonts',
  '/System/Library/Fonts/Supplemental',
];

/** Caracteres representables en WinAnsi (fuentes estándar de PDF como Helvetica). */
const WIN_ANSI_UNSUPPORTED =
  /[^\n\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;

const ASCII_FALLBACKS: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '⇒': '=>',
  '≤': '<=',
  '≥': '>=',
  '≠': '!=',
  '✓': '-',
  '✔': '-',
  '▪': '•',
  '▫': '•',
  '◦': '•',
  '●': '•',
  '○': '•',
  '■': '•',
  '□': '•',
  '►': '•',
  '➢': '•',
  '\uF0A7': '•',
  '\uF0B7': '•',
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '―': '—',
  '−': '-',
  '′': "'",
  '″': '"',
};

const INVISIBLE_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B-\u001F\u007F\u00AD\u200B-\u200D\u2060\uFEFF]/g;

/** Número o viñeta que el usuario escribió al inicio de un ítem ("3. ", "- "). */
const LEADING_MARKER = /^(\d+[.)]|[-•*])\s+/;

type TextOpts = {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  align?: 'left' | 'center' | 'justify';
  color?: string;
  padTop?: number;
  padBottom?: number;
};

/**
 * Pieza de una columna de la tabla. Las columnas se reparten por página
 * bloque a bloque; un bloque de texto largo se parte por palabras.
 */
type Block = {
  height: number;
  /** Ocupa todo el alto que le sobra al tramo (el organigrama). */
  stretch?: boolean;
  /** Un título no queda solo al pie: debe caber también el comienzo del siguiente. */
  keepWithNext?: boolean;
  draw: (x: number, y: number, w: number, h: number) => void;
  /** Cabeza que cabe en `maxH` y el resto; `null` si no se puede partir. */
  split?: (maxH: number) => [Block, Block] | null;
};

type Column = { x: number; w: number; blocks: Block[] };

/** Elemento de una celda de firma, a `y` puntos de su borde superior. */
type FirmaItem = {
  y: number;
  h: number;
  draw: (x: number, y: number, w: number) => void;
};

/** Renglón ya cortado; `end` marca el último de su párrafo (no se justifica). */
type Line = { text: string; end: boolean };

type ParagraphStyle = {
  font: string;
  size: number;
  color: string;
  /** Desplazamiento del texto desde el borde izquierdo de la celda. */
  textX: number;
  textW: number;
  align?: TextOpts['align'];
  marker?: string;
  markerX?: number;
};

type LabelOpts = {
  height?: number;
  size?: number;
  /** Sangría francesa: la 2.ª línea se alinea después de "O. ". */
  hanging?: boolean;
};

type Doc = PDFKit.PDFDocument;

@Injectable()
export class UnidadPdfService {
  /** Nombres de fuente para `doc.font()`; `narrowScale` angosta la Bold si no hay Narrow. */
  private readonly fonts: Record<FontFace, string> & { narrowScale: number };

  /** Archivos a registrar en cada documento, por nombre de fuente. */
  private readonly fontFiles: Record<string, string>;

  private readonly hasGlyph: ((codePoint: number) => boolean) | null;

  constructor() {
    const files = this.resolveFontFiles();
    const hasGlyph = files.regular
      ? this.loadGlyphChecker(files.regular)
      : null;
    const embedded = Boolean(hasGlyph);
    const narrow = embedded && files.narrowBold;

    this.fonts = embedded
      ? {
          regular: 'Body',
          bold: 'Body-Bold',
          italic: 'Body-Italic',
          narrowBold: narrow ? 'Body-NarrowBold' : 'Body-Bold',
          narrowScale: narrow ? 100 : NARROW_SCALE,
        }
      : {
          regular: 'Helvetica',
          bold: 'Helvetica-Bold',
          italic: 'Helvetica-Oblique',
          narrowBold: 'Helvetica-Bold',
          narrowScale: NARROW_SCALE,
        };
    this.fontFiles = embedded
      ? {
          Body: files.regular!,
          'Body-Bold': files.bold!,
          'Body-Italic': files.italic!,
          ...(narrow ? { 'Body-NarrowBold': files.narrowBold! } : {}),
        }
      : {};
    this.hasGlyph = hasGlyph;
  }

  buildUnidadPdf(detail: UnidadPdfDetail): Promise<Buffer> {
    const logoPath = this.resolveLogoPath();
    const nombre = this.clean(nombreUnidadMof(detail.nombre)) || '-';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: PAGE_MARGINS,
        info: {
          Title: `Manual de Organización y Funciones - ${nombre}`,
          Author: 'Universidad Mayor de San Andrés',
        },
      });
      for (const [name, file] of Object.entries(this.fontFiles)) {
        doc.registerFont(name, file);
      }
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.render(doc, detail, nombre, logoPath);
        doc.end();
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  private render(
    doc: Doc,
    detail: UnidadPdfDetail,
    nombre: string,
    logoPath: string | null,
  ) {
    const x = PAGE_MARGINS.left;
    const w = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;
    doc.lineWidth(LINE_WIDTH).strokeColor(COLOR.border);

    const facultad =
      this.clean(detail.facultad).toLocaleUpperCase('es') ||
      ADMINISTRACION_CENTRAL;
    let y = this.drawHeader(doc, x, FIRST_PAGE_TOP, w, facultad, logoPath);

    // —— A. Unidad organizacional | B. Código ——
    const aW = w - WIDTH.codigo;
    const bX = x + aW;
    const abLabelH = this.labelHeight(doc, ['A. UNIDAD ORGANIZACIONAL'], aW);
    const abValueH = Math.max(
      this.textHeight(doc, nombre, aW, {}),
      this.textHeight(doc, this.clean(detail.codigo), WIDTH.codigo, {
        italic: true,
      }),
    );
    y = this.flowColumns(doc, y, [
      {
        x,
        w: aW,
        blocks: [
          this.labelBlock(doc, 'A. UNIDAD ORGANIZACIONAL', aW, {
            height: abLabelH,
          }),
          this.textBlock(doc, nombre, aW, { minHeight: abValueH }),
        ],
      },
      {
        x: bX,
        w: WIDTH.codigo,
        blocks: [
          this.labelBlock(doc, 'B. CÓDIGO', WIDTH.codigo, {
            height: abLabelH,
          }),
          this.textBlock(doc, this.clean(detail.codigo), WIDTH.codigo, {
            italic: true,
            minHeight: abValueH,
          }),
        ],
      },
    ]);

    // —— C–J | K. Organigrama ——
    const leftW = WIDTH.identidad;
    const kW = w - leftW;
    const identidad: [string, Block[]][] = [
      [
        'C. RESOLUCIÓN HCU DE CREACIÓN',
        [
          this.textBlock(
            doc,
            this.clean(detail.resCreacion || detail.res_creacion),
            leftW,
          ),
        ],
      ],
      [
        'D. FECHA DE CREACIÓN',
        [
          this.textBlock(
            doc,
            this.formatDate(detail.fecCreacion ?? detail.fec_creacion),
            leftW,
          ),
        ],
      ],
      [
        'E. NIVEL JERÁRQUICO',
        [this.textBlock(doc, this.clean(nivelMof(detail.nivel)), leftW)],
      ],
      [
        'F. TIPO DE UNIDAD',
        [this.textBlock(doc, this.clean(tipoUnidadMof(detail.tipo)), leftW)],
      ],
      [
        'G. DEPENDENCIA LINEAL',
        [
          this.textBlock(
            doc,
            this.clean(nombreUnidadMof(detail.parent?.nombre)) || NINGUNA,
            leftW,
          ),
        ],
      ],
      [
        'H. DEPENDENCIA FUNCIONAL',
        this.unidadesBlocks(doc, this.dependenciasSinPadre(detail), leftW),
      ],
      [
        'I. UNIDADES DEPENDIENTES (LINEAL)',
        this.unidadesBlocks(doc, detail.hijasLineales, leftW),
      ],
      [
        'J. UNIDADES DEPENDIENTES (FUNCIONAL)',
        this.unidadesBlocks(doc, detail.hijasFuncionales, leftW),
      ],
    ];
    const cLabelH = this.labelHeight(
      doc,
      ['C. RESOLUCIÓN HCU DE CREACIÓN', 'K. ORGANIGRAMA'],
      Math.min(leftW, kW),
    );
    y = this.flowColumns(doc, y, [
      {
        x,
        w: leftW,
        blocks: identidad.flatMap(([label, blocks], i) => [
          this.labelBlock(doc, label, leftW, {
            height: i === 0 ? cLabelH : undefined,
          }),
          ...blocks,
        ]),
      },
      {
        x: x + leftW,
        w: kW,
        blocks: [
          this.labelBlock(doc, 'K. ORGANIGRAMA', kW, { height: cLabelH }),
          this.organigramaBlock(doc, detail, kW),
        ],
      },
    ]);

    // —— L. Objetivo ——
    y = this.flowColumns(doc, y, [
      {
        x,
        w,
        blocks: [
          this.labelBlock(doc, 'L. OBJETIVO DE LA UNIDAD', w, {
            size: FONT_SIZE.labelSmall,
          }),
          this.textBlock(doc, this.clean(detail.objetivo), w, {
            align: 'justify',
          }),
        ],
      },
    ]);

    // —— M. Funciones | N. Base legal ——
    const mW = WIDTH.funciones;
    const nW = w - mW;
    const mnLabelH = this.labelHeight(
      doc,
      ['M. FUNCIONES DE LA UNIDAD', 'N. BASE LEGAL'],
      Math.min(mW, nW),
    );
    y = this.flowColumns(doc, y, [
      {
        x,
        w: mW,
        blocks: [
          this.labelBlock(doc, 'M. FUNCIONES DE LA UNIDAD', mW, {
            height: mnLabelH,
          }),
          ...this.listBlocks(
            doc,
            (detail.funciones || []).map((f) => f.funcion),
            mW,
            { numbered: true, justify: true, indent: LIST.funciones },
          ),
        ],
      },
      {
        x: x + mW,
        w: nW,
        blocks: [
          this.labelBlock(doc, 'N. BASE LEGAL', nW, { height: mnLabelH }),
          ...this.baseLegalBlocks(doc, detail, nW),
        ],
      },
    ]);

    // —— O. Coordinación interna | P. Interinstitucional ——
    const oW = WIDTH.coordinacionInterna;
    const pW = w - oW;
    const oLabel = 'O. RELACIONAMIENTO Y COORDINACIÓN INTERNA';
    const pLabel = 'P. RELACIONAMIENTO Y COORDINACIÓN INTERINSTITUCIONAL';
    const opLabel: LabelOpts = { size: FONT_SIZE.labelSmall, hanging: true };
    const opLabelH = Math.max(
      this.labelHeight(doc, [oLabel], oW, opLabel),
      this.labelHeight(doc, [pLabel], pW, opLabel),
    );
    y = this.flowColumns(doc, y, [
      {
        x,
        w: oW,
        blocks: [
          this.labelBlock(doc, oLabel, oW, { ...opLabel, height: opLabelH }),
          ...this.listBlocks(
            doc,
            nombresUnidadesMof(
              (detail.relacionesInternas || []).map((r) => r.nombre || r.sigla),
            ),
            oW,
            { numbered: true, indent: LIST.internas },
          ),
        ],
      },
      {
        x: x + oW,
        w: pW,
        blocks: [
          this.labelBlock(doc, pLabel, pW, { ...opLabel, height: opLabelH }),
          ...this.listBlocks(
            doc,
            (detail.relacionesExternas || []).map((r) => r.descripcion || ''),
            pW,
            { numbered: true, indent: LIST.externas },
          ),
        ],
      },
    ]);

    // —— Q. Elaborado | R. Revisado | S. Validado | U. Sello ——
    this.drawFirmas(doc, x, y + FIRMA.gap, w);
  }

  // ————————————————————————— Encabezado y firmas —————————————————————————

  private drawHeader(
    doc: Doc,
    x: number,
    y: number,
    w: number,
    facultad: string,
    logoPath: string | null,
  ): number {
    const logoW = WIDTH.logo;
    const rightW = WIDTH.codigo;
    const midW = w - logoW - rightW;
    const lines: [string, number][] = [
      ['UNIVERSIDAD MAYOR DE SAN ANDRÉS', FONT_SIZE.title],
      [this.clean(facultad), FONT_SIZE.facultad],
      ['MANUAL DE ORGANIZACIÓN Y FUNCIONES', FONT_SIZE.title],
    ];
    const textW = midW - HEADER.padX * 2;
    const wrapped = lines.map(([text, size]) => {
      doc.font(this.fonts.bold).fontSize(size);
      const rows = this.wrapLines(doc, text, textW);
      return { size, rows, height: rows.length * doc.currentLineHeight(true) };
    });
    const textH = wrapped.reduce((a, l) => a + l.height, 0);
    const h = Math.max(HEADER.minHeight, textH + HEADER.double * 2);

    // Borde doble: contorno y divisiones entre las tres celdas.
    const d = HEADER.double;
    doc.lineWidth(LINE_WIDTH).strokeColor(COLOR.border);
    doc.rect(x, y, w, h).stroke();
    doc.rect(x + d, y + d, w - d * 2, h - d * 2).stroke();
    const rx = x + logoW + midW;
    [x + logoW, rx].forEach((vx) => {
      doc
        .moveTo(vx - d / 2, y + d)
        .lineTo(vx - d / 2, y + h - d)
        .moveTo(vx + d / 2, y + d)
        .lineTo(vx + d / 2, y + h - d)
        .stroke();
    });

    if (logoPath) {
      try {
        doc.image(logoPath, x + 5, y + 5, {
          fit: [logoW - 10, h - 10],
          align: 'center',
          valign: 'center',
        });
      } catch {
        /* logo opcional */
      }
    }

    let ty = y + (h - textH) / 2;
    wrapped.forEach(({ size, rows, height }) => {
      doc.font(this.fonts.bold).fontSize(size).fillColor(COLOR.text);
      this.drawLines(doc, rows, x + logoW + HEADER.padX, ty, textW, 'center');
      ty += height;
    });

    // Celda derecha: textos fijos de la plantilla, en itálica gris; división doble.
    const cellX = rx + d / 2;
    const cellW = rightW - d * 1.5;
    const splitY = y + HEADER.split;
    doc
      .moveTo(cellX, splitY - d / 2)
      .lineTo(cellX + cellW, splitY - d / 2)
      .moveTo(cellX, splitY + d / 2)
      .lineTo(cellX + cellW, splitY + d / 2)
      .stroke();
    const placeholder = (
      text: string,
      size: number,
      top: number,
      bottom: number,
    ) => {
      doc.font(this.fonts.italic).fontSize(size).fillColor(COLOR.placeholder);
      const opts = { width: cellW - PAD_X * 2, align: 'center' as const };
      const th = doc.heightOfString(text, opts);
      doc.text(text, cellX + PAD_X, top + (bottom - top - th) / 2, opts);
    };
    placeholder(
      'RESOLUCIÓN HCU\nQUE APRUEBA EL MOF',
      FONT_SIZE.resolucion,
      y + d,
      splitY - d / 2,
    );
    placeholder('Versión', FONT_SIZE.version, splitY + d / 2, y + h - d);

    return y + h;
  }

  /**
   * Q/R y S/U como dos filas de la tabla. Igual que en Word, si no entran
   * siguen en la página siguiente: entre filas o, dentro del cuerpo de una
   * firma, entre renglones en blanco (sin cortar la línea, "Nombre:" ni "Cargo:").
   */
  private drawFirmas(doc: Doc, x: number, y: number, w: number): number {
    const leftW = WIDTH.firma;
    const rightW = w - leftW;
    const fila = (left: Block[], right: Block[]) =>
      this.flowColumns(doc, y, [
        { x, w: leftW, blocks: left },
        { x: x + leftW, w: rightW, blocks: right },
      ]);

    const { qr, su } = FIRMA_ROWS;
    y = fila(
      [
        this.firmaLabel(doc, 'Q. ELABORADO POR'),
        this.firmaBody(doc, qr, qr.lineEnd[0]),
      ],
      [
        this.firmaLabel(doc, 'R. REVISADO POR'),
        this.firmaBody(doc, qr, qr.lineEnd[1]),
      ],
    );
    y = fila(
      [
        this.firmaLabel(doc, 'S. VALIDADO POR'),
        this.firmaBody(doc, su, su.lineEnd[0]),
      ],
      [
        this.firmaLabel(doc, 'U. SELLO DE LA UNIDAD'),
        this.selloBody(doc, su, su.lineEnd[1]),
      ],
    );
    return y;
  }

  /** Arial Narrow Bold 10 (o la Bold angostada al 82 %). */
  private narrowText(doc: Doc, text: string, x: number, y: number) {
    // pdfkit admite `horizontalScaling` (operador Tz) aunque sus tipos no lo declaren.
    const opts: PDFKit.Mixins.TextOptions & { horizontalScaling: number } = {
      lineBreak: false,
      horizontalScaling: this.fonts.narrowScale,
    };
    doc
      .font(this.fonts.narrowBold)
      .fontSize(FONT_SIZE.firma)
      .fillColor(COLOR.text)
      .text(text, x, y, opts);
  }

  /** Sin "keep with next": Word deja el título solo al pie si el cuerpo no entra. */
  private firmaLabel(doc: Doc, text: string): Block {
    return {
      height: FIRMA.labelH,
      draw: (x, y, width, bh) => {
        doc
          .lineWidth(LINE_WIDTH)
          .rect(x, y, width, bh)
          .fillAndStroke(COLOR.label, COLOR.border);
        doc.font(this.fonts.narrowBold).fontSize(FONT_SIZE.firma);
        const th = doc.currentLineHeight(true);
        this.narrowText(doc, text, x + FIRMA.padX, y + (bh - th) / 2);
      },
    };
  }

  /** Línea punteada de firma, que termina `endGap` puntos antes del borde derecho. */
  private dashedItem(doc: Doc, lineY: number, endGap: number): FirmaItem {
    return {
      y: lineY,
      h: 1,
      draw: (x, y, w) => {
        doc
          .lineWidth(LINE_WIDTH)
          .strokeColor(COLOR.border)
          .moveTo(x + FIRMA.lineX, y)
          .lineTo(x + w - endGap, y)
          .dash(FIRMA.dash, { space: FIRMA.dashSpace })
          .stroke()
          .undash();
      },
    };
  }

  /** Cuerpo de Q/R/S: línea punteada, "Nombre:" y "Cargo:" en Arial Bold 10. */
  private firmaBody(
    doc: Doc,
    row: { bodyH: number; lineY: number; nombreY: number; cargoY: number },
    endGap: number,
  ): Block {
    doc.font(this.fonts.bold).fontSize(FONT_SIZE.firma);
    const textH = doc.currentLineHeight(true);
    const bold = (text: string, ty: number): FirmaItem => ({
      y: ty,
      h: textH,
      draw: (x, y) => {
        doc
          .font(this.fonts.bold)
          .fontSize(FONT_SIZE.firma)
          .fillColor(COLOR.text)
          .text(text, x + FIRMA.padX, y, { lineBreak: false });
      },
    });
    return this.firmaItemsBlock(
      [
        this.dashedItem(doc, row.lineY, endGap),
        bold('Nombre:', row.nombreY),
        bold('Cargo:', row.cargoY),
      ],
      row.bodyH,
    );
  }

  /** Cuerpo de U: línea punteada y "FECHA:…" en Narrow Bold 10. */
  private selloBody(
    doc: Doc,
    row: { bodyH: number; selloLineY: number; cargoY: number },
    endGap: number,
  ): Block {
    doc.font(this.fonts.narrowBold).fontSize(FONT_SIZE.firma);
    const textH = doc.currentLineHeight(true);
    return this.firmaItemsBlock(
      [
        this.dashedItem(doc, row.selloLineY, endGap),
        {
          y: row.cargoY,
          h: textH,
          draw: (x, y) =>
            this.narrowText(doc, 'FECHA:……………/……………/………….', x + FIRMA.padX, y),
        },
      ],
      row.bodyH,
    );
  }

  /**
   * Celda de alto fijo con elementos en posiciones fijas. Se parte en un
   * múltiplo de renglón (12.65, los párrafos vacíos de Word) antes del primer
   * elemento que no entra entero; el resto baja con su posición relativa.
   */
  private firmaItemsBlock(items: FirmaItem[], height: number): Block {
    const lineH = FONT_SIZE.value * 1.15;
    return {
      height,
      draw: (x, y, w) => items.forEach((it) => it.draw(x, y + it.y, w)),
      split: (maxH) => {
        const blocked = items
          .filter((it) => it.y + it.h > maxH)
          .map((it) => it.y);
        const limit = Math.min(maxH, ...blocked);
        const cut = Math.floor(limit / lineH) * lineH;
        if (cut <= 0 || cut >= height) return null;
        return [
          this.firmaItemsBlock(
            items.filter((it) => it.y + it.h <= cut),
            cut,
          ),
          this.firmaItemsBlock(
            items
              .filter((it) => it.y + it.h > cut)
              .map((it) => ({ ...it, y: it.y - cut })),
            height - cut,
          ),
        ];
      },
    };
  }

  // ————————————————————————— Tabla por columnas —————————————————————————

  /**
   * Dibuja columnas lado a lado que se reparten por página. Cada tramo de
   * página lleva el borde de todas las columnas con el alto del tramo; lo que
   * no entra sigue en la página siguiente (sin repetir títulos, como en Word).
   */
  private flowColumns(doc: Doc, y: number, cols: Column[]): number {
    const queues = cols.map((c) => [...c.blocks]);
    const top = doc.page.margins.top;

    while (queues.some((q) => q.length)) {
      const atPageTop = y <= top + 0.5;
      const avail = this.bottomLimit(doc) - y;
      const placed: { block: Block; y: number }[][] = [];
      const used: number[] = [];
      const pending = queues.map((q) => [...q]);

      cols.forEach((_, i) => {
        const q = pending[i];
        const items: { block: Block; y: number }[] = [];
        let h = 0;
        while (q.length) {
          const room = avail - h;
          const b = q[0];
          const forced = atPageTop && h === 0;
          if (b.height <= room && (this.followFits(q, room) || forced)) {
            items.push({ block: b, y: y + h });
            h += b.height;
            q.shift();
            continue;
          }
          const parts = room >= MIN_FOLLOW ? (b.split?.(room) ?? null) : null;
          if (parts) {
            items.push({ block: parts[0], y: y + h });
            h += parts[0].height;
            q[0] = parts[1];
            break;
          }
          if (forced) {
            // Bloque indivisible más alto que una página: se dibuja igual.
            items.push({ block: b, y: y + h });
            h += b.height;
            q.shift();
            continue;
          }
          break;
        }
        placed.push(items);
        used.push(h);
      });

      if (placed.every((items) => items.length === 0)) {
        doc.addPage();
        y = top;
        continue;
      }
      pending.forEach((q, i) => (queues[i] = q));

      // Como en Word, el tramo termina en el último renglón que entró, aunque siga en la página siguiente.
      const continues = queues.some((q) => q.length);
      const segH = Math.max(...used);

      cols.forEach((c, i) => {
        placed[i].forEach(({ block, y: by }, j) => {
          const last = j === placed[i].length - 1;
          const h = block.stretch && last ? y + segH - by : block.height;
          block.draw(c.x, by, c.w, h);
        });
        doc
          .lineWidth(LINE_WIDTH)
          .strokeColor(COLOR.border)
          .rect(c.x, y, c.w, segH)
          .stroke();
      });

      y += segH;
      if (continues) {
        doc.addPage();
        y = top;
      }
    }
    return y;
  }

  private followFits(q: Block[], room: number): boolean {
    const [b, next] = q;
    if (!b.keepWithNext || !next) return true;
    const needNext = next.split
      ? Math.min(next.height, MIN_FOLLOW)
      : next.height;
    return b.height + needNext <= room;
  }

  /**
   * Renglones de un título. Con sangría francesa (O y P) el primero va al
   * margen y los demás corridos 5 espacios, como en el formato.
   */
  private labelParts(
    doc: Doc,
    text: string,
    w: number,
    opts: LabelOpts,
  ): { first: Line[]; rest: Line[]; hang: number; textW: number } {
    doc.font(this.fonts.bold).fontSize(opts.size ?? FONT_SIZE.label);
    const textW = w - PAD_X * 2;
    const lines = this.wrapLines(doc, text, textW);
    if (!opts.hanging || lines.length < 2) {
      return { first: lines, rest: [], hang: 0, textW };
    }
    const hang = doc.widthOfString(LABEL_HANG_SPACES);
    const restText = lines
      .slice(1)
      .map((l) => l.text)
      .join(' ');
    return {
      first: [lines[0]],
      rest: this.wrapLines(doc, restText, textW - hang),
      hang,
      textW,
    };
  }

  private labelHeight(
    doc: Doc,
    labels: string[],
    w: number,
    opts: LabelOpts = {},
  ): number {
    return Math.max(
      ...labels.map((l) => {
        const { first, rest } = this.labelParts(doc, l, w, opts);
        const n = first.length + rest.length;
        return n * doc.currentLineHeight(true) + PAD_Y * 2;
      }),
    );
  }

  private labelBlock(
    doc: Doc,
    text: string,
    w: number,
    opts: LabelOpts = {},
  ): Block {
    const h = opts.height ?? this.labelHeight(doc, [text], w, opts);
    return {
      height: h,
      keepWithNext: true,
      draw: (x, y, width, bh) => {
        doc
          .lineWidth(LINE_WIDTH)
          .rect(x, y, width, bh)
          .fillAndStroke(COLOR.label, COLOR.border);
        const { first, rest, hang, textW } = this.labelParts(
          doc,
          text,
          width,
          opts,
        );
        doc.fillColor(COLOR.text);
        this.drawLines(doc, first, x + PAD_X, y + PAD_Y, textW);
        this.drawLines(
          doc,
          rest,
          x + PAD_X + hang,
          y + PAD_Y + first.length * doc.currentLineHeight(true),
          textW - hang,
        );
      },
    };
  }

  private textFont(opts: TextOpts): string {
    if (opts.bold) return this.fonts.bold;
    return opts.italic ? this.fonts.italic : this.fonts.regular;
  }

  private textHeight(
    doc: Doc,
    text: string,
    w: number,
    opts: TextOpts,
  ): number {
    return this.textBlock(doc, text, w, opts).height;
  }

  /** Párrafo con sangría de celda. Vacío deja un renglón en blanco. */
  private textBlock(
    doc: Doc,
    text: string,
    w: number,
    opts: TextOpts & { minHeight?: number } = {},
  ): Block {
    const font = this.textFont(opts);
    const size = opts.size ?? FONT_SIZE.value;
    const textW = w - PAD_X * 2;
    doc.font(font).fontSize(size);
    return this.paragraphBlock(
      doc,
      this.wrapLines(doc, text, textW),
      {
        font,
        size,
        color: opts.color ?? COLOR.text,
        textX: PAD_X,
        textW,
        align: opts.align,
      },
      { top: opts.padTop ?? PAD_Y, bottom: opts.padBottom ?? PAD_Y },
      opts.minHeight,
    );
  }

  /** Ítem con marcador ("12." o "•") y sangría francesa. */
  private itemBlock(
    doc: Doc,
    marker: string,
    text: string,
    w: number,
    indent: ListIndent,
    opts: { padTop: number; padBottom: number; justify?: boolean },
  ): Block {
    const textW = w - indent.textX - PAD_X;
    doc.font(this.fonts.regular).fontSize(FONT_SIZE.value);
    return this.paragraphBlock(
      doc,
      this.wrapLines(doc, text, textW),
      {
        font: this.fonts.regular,
        size: FONT_SIZE.value,
        color: COLOR.text,
        textX: indent.textX,
        textW,
        align: opts.justify ? 'justify' : undefined,
        marker,
        markerX: indent.markerX,
      },
      { top: opts.padTop, bottom: opts.padBottom },
    );
  }

  /**
   * Renglones ya cortados con su estilo. Se parte entre renglones: la cabeza
   * conserva el marcador y la cola sigue en la página siguiente.
   */
  private paragraphBlock(
    doc: Doc,
    lines: Line[],
    style: ParagraphStyle,
    pad: { top: number; bottom: number },
    minHeight = 0,
  ): Block {
    doc.font(style.font).fontSize(style.size);
    const lineH = doc.currentLineHeight(true);
    return {
      height: Math.max(pad.top + lines.length * lineH + pad.bottom, minHeight),
      draw: (x, y) => {
        doc.font(style.font).fontSize(style.size).fillColor(style.color);
        if (style.marker) {
          doc.text(style.marker, x + (style.markerX ?? 0), y + pad.top, {
            lineBreak: false,
          });
        }
        this.drawLines(
          doc,
          lines,
          x + style.textX,
          y + pad.top,
          style.textW,
          style.align,
        );
      },
      split: (maxH) => {
        const n = Math.floor((maxH - pad.top + 0.01) / lineH);
        if (n < 1 || n >= lines.length) return null;
        return [
          this.paragraphBlock(doc, lines.slice(0, n), style, {
            top: pad.top,
            bottom: 0,
          }),
          this.paragraphBlock(
            doc,
            lines.slice(n),
            { ...style, marker: undefined },
            { top: 0, bottom: pad.bottom },
          ),
        ];
      },
    };
  }

  /**
   * Corta el texto en renglones como Word: una palabra entra si cabe sin el
   * espacio que la sigue (pdfkit sí lo cuenta y corta una palabra antes). Una
   * palabra más ancha que el renglón se corta por caracteres. Usa la fuente
   * activa del documento.
   */
  private wrapLines(doc: Doc, text: string, width: number): Line[] {
    // Word mide con los anchos de pantalla de Arial, algo más angostos que los
    // de la fuente (ver WORD_WIDTH_FACTOR); 0.05 pt de tolerancia porque
    // maqueta en vigésimos de punto.
    const fits = (s: string) =>
      doc.widthOfString(s) * WORD_WIDTH_FACTOR <= width + 0.05;
    const lines: Line[] = [];
    for (const para of (text ?? '').split('\n')) {
      let line = '';
      for (let word of para.split(' ').filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (fits(candidate)) {
          line = candidate;
          continue;
        }
        if (line) lines.push({ text: line, end: false });
        while (!fits(word)) {
          let lo = 1;
          let hi = word.length - 1;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (fits(word.slice(0, mid))) lo = mid;
            else hi = mid - 1;
          }
          lines.push({ text: word.slice(0, lo), end: false });
          word = word.slice(lo);
        }
        line = word;
      }
      lines.push({ text: line, end: true });
    }
    return lines;
  }

  /**
   * Dibuja renglones ya cortados con la fuente activa. "justify" estira todos
   * menos el último de cada párrafo, como Word.
   */
  private drawLines(
    doc: Doc,
    lines: Line[],
    x: number,
    y: number,
    width: number,
    align?: TextOpts['align'],
  ) {
    const lineH = doc.currentLineHeight(true);
    lines.forEach((line, i) => {
      if (!line.text) return;
      const ly = y + i * lineH;
      const lw = doc.widthOfString(line.text);
      const gaps = line.text.split(' ').length - 1;
      if (align === 'justify' && !line.end && gaps > 0) {
        // Puede ser negativo (hasta ~0.7 %): el renglón cierra justo en el margen, como en Word.
        const wordSpacing = (width - lw) / gaps;
        doc.text(line.text, x, ly, { lineBreak: false, wordSpacing });
        return;
      }
      const dx = align === 'center' ? (width - lw) / 2 : 0;
      doc.text(line.text, x + dx, ly, { lineBreak: false });
    });
  }

  /**
   * Lista numerada (o con viñetas) con el número y el texto en las posiciones
   * del formato, sin espacio extra entre ítems; vacía muestra "Ninguna.".
   */
  private listBlocks(
    doc: Doc,
    raw: (string | null | undefined)[],
    w: number,
    opts: { numbered: boolean; justify?: boolean; indent: ListIndent },
  ): Block[] {
    const items = raw.map((t) => this.itemText(t)).filter(Boolean);
    if (!items.length) return [this.textBlock(doc, NINGUNA, w)];

    // Si el número más largo ("100.") no entra antes del texto, el texto se corre.
    doc.font(this.fonts.regular).fontSize(FONT_SIZE.value);
    const longest = opts.numbered ? `${items.length}.` : '•';
    const minTextX = opts.indent.markerX + doc.widthOfString(longest) + 2;
    const indent: ListIndent = {
      markerX: opts.indent.markerX,
      textX: Math.max(opts.indent.textX, minTextX),
    };
    return items.map((text, i) =>
      this.itemBlock(doc, opts.numbered ? `${i + 1}.` : '•', text, w, indent, {
        padTop: i === 0 ? PAD_Y : 0,
        padBottom: i === items.length - 1 ? PAD_Y : 0,
        justify: opts.justify,
      }),
    );
  }

  /** Una unidad sola va como texto; varias, numeradas; ninguna, "Ninguna.". */
  private unidadesBlocks(
    doc: Doc,
    unidades: { nombre?: string | null; sigla?: string | null }[] | undefined,
    w: number,
  ): Block[] {
    const nombres = nombresUnidadesMof(
      (unidades || []).map((u) => u.nombre || u.sigla),
    )
      .map((n) => this.clean(n))
      .filter(Boolean);
    if (nombres.length === 1) return [this.textBlock(doc, nombres[0], w)];
    return this.listBlocks(doc, nombres, w, {
      numbered: true,
      indent: LIST.unidades,
    });
  }

  /**
   * N. Base legal: la de la unidad. Si no tiene, las distintas de sus
   * funciones con viñetas; si tampoco hay, la celda queda en blanco.
   */
  private baseLegalBlocks(
    doc: Doc,
    detail: UnidadPdfDetail,
    w: number,
  ): Block[] {
    const unidad = this.clean(detail.baseLegal || detail.base_legal);
    if (unidad) return [this.textBlock(doc, unidad, w)];

    const seen = new Set<string>();
    const deFunciones = (detail.funciones || [])
      .map((f) => this.clean(f.baseLegal))
      .filter((b) => {
        const key = b.toLocaleLowerCase('es');
        if (!b || b === '-' || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!deFunciones.length) return [this.textBlock(doc, '', w)];
    return this.listBlocks(doc, deFunciones, w, {
      numbered: false,
      indent: LIST.baseLegal,
    });
  }

  /** Texto del ítem sin el número o viñeta que ya traía escrito. */
  private itemText(value: string | null | undefined): string {
    return this.clean(value).replace(LEADING_MARKER, '').trim();
  }

  // ————————————————————————— K. Organigrama —————————————————————————

  /** Padre → unidad (resaltada) → hijas lineales, centrado en la celda K. */
  private organigramaBlock(
    doc: Doc,
    detail: UnidadPdfDetail,
    w: number,
  ): Block {
    const box = (nombre?: string | null) =>
      this.clean(nombreCorto(nombre)).toLocaleUpperCase('es');
    const parent = detail.parent?.nombre ? box(detail.parent.nombre) : null;
    const unidad = box(detail.nombre) || '-';
    const todas = (detail.hijasLineales || [])
      .map((h) => box(h.nombre || h.sigla))
      .filter(Boolean);
    const MAX_HIJAS = 8;
    const hijas =
      todas.length > MAX_HIJAS
        ? [
            ...todas.slice(0, MAX_HIJAS - 1),
            `+${todas.length - (MAX_HIJAS - 1)} MÁS`,
          ]
        : todas;

    const PAD = 10;
    const VGAP = 14;
    const HGAP = 6;
    const innerW = w - PAD * 2;
    const mainW = Math.min(innerW * 0.5, 130);
    const perRow = Math.min(Math.max(hijas.length, 1), 4);
    const childW = Math.min(
      (innerW - HGAP * (perRow - 1)) / perRow,
      hijas.length <= 2 ? mainW : Infinity,
    );

    const boxH = (text: string, bw: number, bold: boolean) => {
      doc
        .font(bold ? this.fonts.bold : this.fonts.regular)
        .fontSize(bold ? FONT_SIZE.orgUnidad : FONT_SIZE.org);
      return Math.max(
        20,
        doc.heightOfString(text, { width: bw - 6, align: 'center' }) + 8,
      );
    };
    const parentH = parent ? boxH(parent, mainW, false) : 0;
    const unidadH = boxH(unidad, mainW, true);

    // Filas de hasta 4 cajas. Las filas siguientes ocupan primero los lugares
    // del centro para que el tronco pase entre la 2.ª y la 3.ª caja.
    const rows: { slot: number; text: string }[][] = [];
    for (let i = 0; i < hijas.length; i += perRow) {
      const chunk = hijas.slice(i, i + perRow);
      const slots =
        i === 0 || perRow < 4
          ? chunk.map((_, j) => j)
          : [1, 2, 0, 3].slice(0, chunk.length).sort((a, b) => a - b);
      rows.push(chunk.map((text, j) => ({ slot: slots[j], text })));
    }
    const rowHeights = rows.map((r) =>
      Math.max(...r.map((c) => boxH(c.text, childW, false))),
    );

    const needed =
      PAD * 2 +
      (parent ? parentH + VGAP : 0) +
      unidadH +
      rowHeights.reduce((a, h) => a + VGAP + h, 0);

    const drawBox = (
      text: string,
      bx: number,
      by: number,
      bw: number,
      bh: number,
      bold: boolean,
    ) => {
      if (bold) {
        doc.rect(bx, by, bw, bh).fillAndStroke(COLOR.unidad, COLOR.border);
      } else {
        doc.rect(bx, by, bw, bh).stroke();
      }
      doc
        .font(bold ? this.fonts.bold : this.fonts.regular)
        .fontSize(bold ? FONT_SIZE.orgUnidad : FONT_SIZE.org)
        .fillColor(COLOR.text);
      const th = doc.heightOfString(text, { width: bw - 6, align: 'center' });
      doc.text(text, bx + 3, by + (bh - th) / 2, {
        width: bw - 6,
        align: 'center',
      });
    };
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      doc.moveTo(x1, y1).lineTo(x2, y2).stroke();

    return {
      height: needed,
      stretch: true,
      draw: (x, y, width, h) => {
        doc.lineWidth(LINE_WIDTH).strokeColor(COLOR.border);
        const cx = x + width / 2;
        let cy = y + Math.max(PAD, (h - needed) / 2 + PAD);

        if (parent) {
          drawBox(parent, cx - mainW / 2, cy, mainW, parentH, false);
          line(cx, cy + parentH, cx, cy + parentH + VGAP);
          cy += parentH + VGAP;
        }
        drawBox(unidad, cx - mainW / 2, cy, mainW, unidadH, true);
        let trunkFrom = cy + unidadH;
        cy += unidadH;

        const rowW = perRow * childW + (perRow - 1) * HGAP;
        const rowX = cx - rowW / 2;
        rows.forEach((row, r) => {
          const rowTop = cy + VGAP;
          const busY = rowTop - VGAP / 2;
          const centers = row.map(
            (c) => rowX + c.slot * (childW + HGAP) + childW / 2,
          );
          line(cx, trunkFrom, cx, busY);
          line(Math.min(cx, ...centers), busY, Math.max(cx, ...centers), busY);
          row.forEach((c, j) => {
            line(centers[j], busY, centers[j], rowTop);
            drawBox(
              c.text,
              centers[j] - childW / 2,
              rowTop,
              childW,
              rowHeights[r],
              false,
            );
          });
          trunkFrom = busY;
          cy = rowTop + rowHeights[r];
        });
      },
    };
  }

  // ————————————————————————— Utilidades —————————————————————————

  private resolveLogoPath(): string | null {
    const candidates = [
      join(__dirname, '..', '..', '..', 'assets', 'umsa-logo.png'), // dist/assets
      join(__dirname, '..', '..', 'assets', 'umsa-logo.png'), // src relative when ts-node
      join(process.cwd(), 'src', 'assets', 'umsa-logo.png'),
      join(process.cwd(), 'assets', 'umsa-logo.png'),
      join(process.cwd(), 'dist', 'assets', 'umsa-logo.png'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return null;
  }

  /** Carpetas `assets/fonts` posibles (dist o src, según cómo arranque el backend). */
  private assetFontDirs(): string[] {
    return [
      join(__dirname, '..', '..', '..', 'assets', 'fonts'),
      join(__dirname, '..', '..', 'assets', 'fonts'),
      join(process.cwd(), 'src', 'assets', 'fonts'),
      join(process.cwd(), 'assets', 'fonts'),
      join(process.cwd(), 'dist', 'assets', 'fonts'),
    ];
  }

  /** Primer archivo que existe entre `dirs` × `names`. */
  private findFontFile(dirs: string[], names: string[]): string | null {
    for (const dir of dirs) {
      for (const name of names) {
        const p = join(dir, name);
        if (existsSync(p)) return p;
      }
    }
    return null;
  }

  /**
   * Arial (assets o sistema) si están regular, bold e italic; si no, Liberation
   * Sans del repo, sin mezclar familias. Narrow Bold se busca aparte; si falta,
   * el constructor angosta la Bold.
   */
  private resolveFontFiles(): Partial<Record<FontFace, string>> {
    const assets = this.assetFontDirs();
    const all = [...assets, ...SYSTEM_FONT_DIRS];
    const faces = ['regular', 'bold', 'italic'] as const;

    const arial = faces.map((f) => this.findFontFile(all, ARIAL_FILES[f]));
    const liberation = faces.map((f) =>
      this.findFontFile(assets, [LIBERATION_FILES[f]]),
    );
    const family = arial.every(Boolean)
      ? arial
      : liberation.every(Boolean)
        ? liberation
        : null;
    if (!family) return {};

    const narrowBold =
      family === arial ? this.findFontFile(all, ARIAL_FILES.narrowBold) : null;
    return {
      regular: family[0]!,
      bold: family[1]!,
      italic: family[2]!,
      ...(narrowBold ? { narrowBold } : {}),
    };
  }

  /** fontkit llega como dependencia de pdfkit; se resuelve desde pdfkit para no depender del hoisting. */
  private loadGlyphChecker(
    fontPath: string,
  ): ((codePoint: number) => boolean) | null {
    try {
      const requireFromPdfkit = createRequire(require.resolve('pdfkit'));
      const fontkit = requireFromPdfkit('fontkit') as {
        openSync(path: string): {
          hasGlyphForCodePoint(codePoint: number): boolean;
        };
      };
      const font = fontkit.openSync(fontPath);
      return (cp) => font.hasGlyphForCodePoint(cp);
    } catch {
      return null;
    }
  }

  private bottomLimit(doc: Doc): number {
    return doc.page.height - doc.page.margins.bottom;
  }

  /** Deja el texto en caracteres que la fuente activa puede dibujar; lo que no, se sustituye o se descarta. */
  private clean(value: string | null | undefined): string {
    const text = (value ?? '')
      .toString()
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')
      .replace(INVISIBLE_CHARS, '');

    const supported = Array.from(text)
      .map((ch) => {
        if (ch === '\n') return ch;
        const cp = ch.codePointAt(0)!;
        if (this.hasGlyph) {
          return this.hasGlyph(cp) ? ch : (ASCII_FALLBACKS[ch] ?? '');
        }
        return ASCII_FALLBACKS[ch] ?? ch;
      })
      .join('');

    const encodable = this.hasGlyph
      ? supported
      : supported.replace(WIN_ANSI_UNSUPPORTED, '');

    return encodable
      .split('\n')
      .map((line) => line.replace(/ {2,}/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** La dependencia lineal (padre) ya tiene su propia fila; no se repite como funcional. */
  private dependenciasSinPadre(
    detail: UnidadPdfDetail,
  ): NonNullable<UnidadPdfDetail['dependenciasFuncionales']> {
    const parentId =
      detail.parent?.id != null ? Number(detail.parent.id) : null;
    const seen = new Set<number>();
    return (detail.dependenciasFuncionales || []).filter((d) => {
      if (d.id == null) return true;
      const id = Number(d.id);
      if (id === parentId || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
}
