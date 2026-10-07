import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

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

/** Paleta institucional UMSA / MOF */
const C = {
  navy: '#0B1F3A',
  navyMid: '#14365F',
  gold: '#C9A227',
  goldSoft: '#F5E9C4',
  slate: '#334155',
  muted: '#64748B',
  line: '#CBD5E1',
  panel: '#F1F5F9',
  panelAlt: '#E8EEF5',
  white: '#FFFFFF',
  text: '#0F172A',
};

const META_ROW_GAP = 5;

@Injectable()
export class UnidadPdfService {
  constructor(private readonly config: ConfigService) {}

  async buildUnidadPdf(detail: UnidadPdfDetail): Promise<Buffer> {
    const qrPng = await this.buildQrPng(detail.id);
    const logoPath = this.resolveLogoPath();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 28, bottom: 28, left: 36, right: 36 },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const marginL = 36;
      const marginR = 36;
      const contentW = pageW - marginL - marginR;
      const colGap = 10;
      const colW = (contentW - colGap) / 2;
      const leftX = marginL;
      const rightX = marginL + colW + colGap;

      const nombre = this.upper(detail.nombre);
      const codigo = detail.codigo || '';
      const resCreacion = this.upper(
        detail.resCreacion || detail.res_creacion || '-',
      );
      const fecCreacion = this.formatDate(
        detail.fecCreacion ?? detail.fec_creacion,
      );
      const nivel = this.upper(detail.nivel || '-');
      const tipo = this.upper(detail.tipo || '-');
      const dependencia = this.upper(detail.parent?.nombre || '-');
      const funcionales = this.listNames(
        this.dependenciasSinPadre(detail),
      );
      const lineal = this.listNames(detail.hijasLineales);
      const funcional = this.listNames(detail.hijasFuncionales);
      const objetivo = (detail.objetivo || '').toString().trim() || '-';
      const baseLegalUnidad = (detail.baseLegal || detail.base_legal || '')
        .toString()
        .trim();
      const relInterno = this.listNames(detail.relacionesInternas);
      const relExterno = this.listDescripciones(detail.relacionesExternas);

      // —— Header institucional ——
      doc.rect(0, 0, pageW, 78).fill(C.navy);
      doc.rect(0, 78, pageW, 4).fill(C.gold);

      const logoH = 58;
      if (logoPath) {
        try {
          doc.image(logoPath, marginL, 10, { height: logoH });
        } catch {
          /* logo opcional */
        }
      }

      const headerTextX = marginL + 72;
      const headerTextW = contentW - 72;
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C.goldSoft)
        .text('UNIVERSIDAD MAYOR DE SAN ANDRÉS', headerTextX, 16, {
          width: headerTextW,
          align: 'left',
        });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#94A3B8')
        .text(
          'Sistema de Manual de Organización y Funciones (MOF)',
          headerTextX,
          30,
          {
            width: headerTextW,
          },
        );
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(C.white)
        .text('FICHA DE UNIDAD ORGANIZACIONAL', headerTextX, 48, {
          width: headerTextW,
        });

      let y = 94;

      // —— Baner nombre / código ——
      doc.roundedRect(marginL, y, contentW, 28, 3).fill(C.panelAlt);
      doc
        .moveTo(marginL, y)
        .lineTo(marginL, y + 28)
        .strokeColor(C.gold)
        .lineWidth(3)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(C.navy)
        .text(nombre, marginL + 10, y + 8, {
          width: contentW - 130,
          height: 14,
          ellipsis: true,
        });
      const rawSigla = (detail.sigla || '').trim();
      const isBadSigla =
        !rawSigla ||
        rawSigla === '-' ||
        rawSigla === codigo ||
        /^[0-9.]+$/.test(rawSigla);
      const cleanSigla = isBadSigla ? null : rawSigla;
      const codeSiglaText = cleanSigla
        ? `Código: ${codigo}  |  Sigla: ${cleanSigla}`
        : `Código: ${codigo}`;

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(codeSiglaText, marginL + contentW - 145, y + 9, {
          width: 140,
          align: 'right',
        });

      y += 38;

      // —— Identidad + estructura ——
      const identityTop = y;
      const boxPad = 8;
      const identityRows: [string, string][] = [
        ['Resolución', resCreacion],
        ['Fecha creación', fecCreacion],
        ['Nivel jerárquico', nivel],
        ['Tipo', tipo],
        ['Dependencia lineal', dependencia],
      ];
      const identityBoxH = Math.max(
        118,
        boxPad * 2 + this.measureMetaRows(doc, identityRows, colW - boxPad * 2),
      );

      doc.roundedRect(leftX, identityTop, colW, identityBoxH, 3).fill(C.panel);
      doc
        .roundedRect(leftX, identityTop, colW, identityBoxH, 3)
        .strokeColor(C.line)
        .lineWidth(0.8)
        .stroke();

      this.drawMetaRows(
        doc,
        leftX + boxPad,
        identityTop + boxPad,
        identityRows,
        colW - boxPad * 2,
      );

      // Org card
      doc.roundedRect(rightX, identityTop, colW, identityBoxH, 3).fill(C.navy);
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.gold)
        .text('ESTRUCTURA ORGANIZACIONAL', rightX + 8, identityTop + 10, {
          width: colW - 16,
          align: 'center',
        });

      const parentBoxY = identityTop + 28;
      doc
        .roundedRect(rightX + 16, parentBoxY, colW - 32, 28, 2)
        .fill(C.navyMid);
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#CBD5E1')
        .text(dependencia, rightX + 20, parentBoxY + 8, {
          width: colW - 40,
          align: 'center',
          height: 16,
          ellipsis: true,
        });

      // connector
      const cx = rightX + colW / 2;
      doc
        .moveTo(cx, parentBoxY + 28)
        .lineTo(cx, parentBoxY + 40)
        .strokeColor(C.gold)
        .lineWidth(1.2)
        .stroke();

      const unitBoxY = parentBoxY + 40;
      doc.roundedRect(rightX + 16, unitBoxY, colW - 32, 36, 2).fill(C.gold);
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.navy)
        .text(nombre, rightX + 20, unitBoxY + 10, {
          width: colW - 40,
          align: 'center',
          height: 20,
          ellipsis: true,
        });

      y = identityTop + identityBoxH + 12;

      // —— Dependencias ——
      y = this.drawSectionStart(doc, marginL, y, 'DEPENDENCIAS', contentW);
      y = this.drawMetaPanel(
        doc,
        marginL,
        y,
        contentW,
        [
          ['Funcionales', funcionales],
          ['Dependientes (lineal)', lineal],
          ['Dependientes (funcional)', funcional],
        ],
      );
      y += 10;

      // —— Objetivo ——
      y = this.drawSectionStart(doc, marginL, y, 'OBJETIVO', contentW);
      y = this.drawTextPanel(doc, marginL, y, contentW, objetivo, {
        fontSize: 7.5,
        align: 'justify',
      });
      y += 10;

      // —— Funciones | Base legal ——
      y = this.drawSectionStart(
        doc,
        marginL,
        y,
        'FUNCIONES Y BASE LEGAL',
        contentW,
      );
      if (baseLegalUnidad) {
        y = this.drawTextPanel(doc, marginL, y, contentW, baseLegalUnidad, {
          title: 'Base legal de la unidad',
          fontSize: 7,
        });
        y += 6;
      }
      y = this.drawFuncionesTable(doc, marginL, y, contentW, detail.funciones);
      y += 10;

      // —— Relacionamiento ——
      y = this.drawSectionStart(
        doc,
        marginL,
        y,
        'RELACIONAMIENTO Y COORDINACIÓN',
        contentW,
      );
      y = this.drawTwoColumnPanels(
        doc,
        y,
        [
          { x: leftX, title: 'Interno', text: relInterno },
          { x: rightX, title: 'Interinstitucional / externo', text: relExterno },
        ],
        colW,
        contentW,
      );
      y += 12;

      // —— Footer ——
      const footerH = 78;
      y = this.ensureSpace(doc, y, footerH);
      const footerY = Math.max(
        y,
        doc.page.height - doc.page.margins.bottom - footerH,
      );
      doc.roundedRect(marginL, footerY, contentW, footerH, 3).fill(C.navy);

      const qrSize = 58;
      const qrX = pageW - marginR - 12 - qrSize;
      const qrY = footerY + (footerH - qrSize) / 2;
      if (qrPng) {
        doc
          .roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 2)
          .fill(C.white);
        doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.gold)
        .text('Verificación del documento', marginL + 12, footerY + 16, {
          width: contentW - qrSize - 36,
        });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#CBD5E1')
        .text(
          'Escanee el código QR para verificar que este documento no ha sido alterado.',
          marginL + 12,
          footerY + 30,
          { width: contentW - qrSize - 36 },
        );
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#94A3B8')
        .text(
          `Unidad ID: ${detail.id}  ·  Código: ${codigo}  ·  Emisión: ${this.formatDate(new Date())}`,
          marginL + 12,
          footerY + 52,
          { width: contentW - qrSize - 36 },
        );

      doc.end();
    });
  }

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

  private async buildQrPng(unidadId: number): Promise<Buffer | null> {
    const base =
      this.config.get<string>('MOF_PDF_QR_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:5173';
    const url = `${base}/mof/listar-unidades?unidad=${unidadId}`;
    try {
      return await QRCode.toBuffer(url, {
        type: 'png',
        width: 160,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0B1F3A', light: '#FFFFFF' },
      });
    } catch {
      return null;
    }
  }

  private drawSectionBar(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    title: string,
    width: number,
  ): number {
    const h = 16;
    doc.roundedRect(x, y, width, h, 2).fill(C.navy);
    doc.rect(x, y, 4, h).fill(C.gold);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.white)
      .text(title, x + 10, y + 4, { width: width - 14 });
    return y + h;
  }

  private bottomLimit(doc: PDFKit.PDFDocument): number {
    return doc.page.height - doc.page.margins.bottom;
  }

  private pageBodyHeight(doc: PDFKit.PDFDocument): number {
    return this.bottomLimit(doc) - doc.page.margins.top;
  }

  /** Devuelve `y` si caben `needed` puntos; si no, abre una página nueva. */
  private ensureSpace(
    doc: PDFKit.PDFDocument,
    y: number,
    needed: number,
  ): number {
    if (y + needed <= this.bottomLimit(doc)) return y;
    doc.addPage();
    return doc.page.margins.top;
  }

  /** La barra exige espacio para algo de contenido para no quedar huérfana al pie. */
  private drawSectionStart(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    title: string,
    width: number,
  ): number {
    y = this.ensureSpace(doc, y, 16 + 6 + 40);
    return this.drawSectionBar(doc, x, y, title, width) + 6;
  }

  private drawPanelBox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    doc.roundedRect(x, y, width, height, 3).fill(C.panel);
    doc
      .roundedRect(x, y, width, height, 3)
      .strokeColor(C.line)
      .lineWidth(0.6)
      .stroke();
  }

  private measureMetaRow(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    width: number,
  ): number {
    doc.font('Helvetica-Bold').fontSize(6.5);
    const labelH = doc.heightOfString(label.toUpperCase(), { width });
    doc.font('Helvetica').fontSize(7.5);
    const valueH = doc.heightOfString(value || '-', { width });
    return labelH + 0.5 + valueH;
  }

  private measureMetaRows(
    doc: PDFKit.PDFDocument,
    rows: [string, string][],
    width: number,
  ): number {
    const gaps = META_ROW_GAP * Math.max(rows.length - 1, 0);
    return rows.reduce(
      (sum, [label, value]) =>
        sum + this.measureMetaRow(doc, label, value, width),
      gaps,
    );
  }

  private drawMetaRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    label: string,
    value: string,
    width: number,
  ): number {
    doc
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .fillColor(C.muted)
      .text(label.toUpperCase(), x, y, { width });
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.text)
      .text(value || '-', x, doc.y + 0.5, { width });
    return doc.y;
  }

  private drawMetaRows(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    rows: [string, string][],
    width: number,
  ): number {
    rows.forEach(([label, value], i) => {
      if (i > 0) y += META_ROW_GAP;
      y = this.drawMetaRow(doc, x, y, label, value, width);
    });
    return y;
  }

  private drawMetaPanel(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    rows: [string, string][],
  ): number {
    const pad = 8;
    const inner = width - pad * 2;
    const h = pad * 2 + this.measureMetaRows(doc, rows, inner);
    if (h <= this.pageBodyHeight(doc)) {
      y = this.ensureSpace(doc, y, h);
      this.drawPanelBox(doc, x, y, width, h);
      this.drawMetaRows(doc, x + pad, y + pad, rows, inner);
      return y + h;
    }
    rows.forEach(([label, value]) => {
      y = this.ensureSpace(doc, y, 40);
      y = this.drawMetaRow(doc, x + pad, y, label, value, inner) + META_ROW_GAP;
    });
    return y;
  }

  private drawTextPanel(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    text: string,
    opts: { title?: string; fontSize: number; align?: 'left' | 'justify' },
  ): number {
    const pad = 8;
    const inner = width - pad * 2;
    const titleH = opts.title
      ? doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .heightOfString(opts.title, { width: inner }) + 4
      : 0;
    const textH = doc
      .font('Helvetica')
      .fontSize(opts.fontSize)
      .heightOfString(text, { width: inner, align: opts.align });
    const h = pad * 2 + titleH + textH;
    const fitsInPage = h <= this.pageBodyHeight(doc);

    y = this.ensureSpace(doc, y, fitsInPage ? h : 40);
    if (fitsInPage) this.drawPanelBox(doc, x, y, width, h);

    let ty = y + pad;
    if (opts.title) {
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(C.navyMid)
        .text(opts.title, x + pad, ty, { width: inner });
      ty = doc.y + 4;
    }
    doc
      .font('Helvetica')
      .fontSize(opts.fontSize)
      .fillColor(C.text)
      .text(text, x + pad, ty, { width: inner, align: opts.align });
    return fitsInPage ? y + h : doc.y + pad;
  }

  private drawTwoColumnPanels(
    doc: PDFKit.PDFDocument,
    y: number,
    cols: { x: number; title: string; text: string }[],
    colW: number,
    fullWidth: number,
  ): number {
    const pad = 8;
    const inner = colW - pad * 2;
    const h = Math.max(
      ...cols.map((c) => {
        const titleH = doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .heightOfString(c.title, { width: inner });
        const textH = doc
          .font('Helvetica')
          .fontSize(7)
          .heightOfString(c.text, { width: inner });
        return pad * 2 + titleH + 4 + textH;
      }),
    );

    if (h > this.pageBodyHeight(doc)) {
      cols.forEach((c, i) => {
        if (i > 0) y += 6;
        y = this.drawTextPanel(doc, cols[0].x, y, fullWidth, c.text, {
          title: c.title,
          fontSize: 7,
        });
      });
      return y;
    }

    y = this.ensureSpace(doc, y, h);
    cols.forEach((c) => {
      this.drawPanelBox(doc, c.x, y, colW, h);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(C.navyMid)
        .text(c.title, c.x + pad, y + pad, { width: inner });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.text)
        .text(c.text, c.x + pad, doc.y + 4, { width: inner });
    });
    return y + h;
  }

  private drawFuncionesTable(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    funciones?: { funcion: string; baseLegal?: string | null }[],
  ): number {
    const widths = [width * 0.06, width * 0.54, width * 0.4];
    const pad = 4;
    const headerH = 16;
    const rows: string[][] = funciones?.length
      ? funciones.map((f, i) => [
          String(i + 1),
          (f.funcion || '').toString().trim() || '-',
          (f.baseLegal || '').toString().trim() || '-',
        ])
      : [['-', '-', '-']];

    const drawColumnLines = (top: number, h: number, color: string) => {
      let cx = x;
      for (let i = 0; i < widths.length - 1; i++) {
        cx += widths[i];
        doc
          .moveTo(cx, top)
          .lineTo(cx, top + h)
          .strokeColor(color)
          .lineWidth(0.5)
          .stroke();
      }
    };

    const drawHeader = (top: number): number => {
      doc.rect(x, top, width, headerH).fill(C.navy);
      drawColumnLines(top, headerH, C.navyMid);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white);
      let cx = x;
      ['N°', 'Función', 'Base legal'].forEach((title, i) => {
        doc.text(title, cx + pad, top + 5, {
          width: widths[i] - pad * 2,
          align: i === 0 ? 'center' : 'left',
        });
        cx += widths[i];
      });
      return top + headerH;
    };

    y = this.ensureSpace(doc, y, headerH + 24);
    y = drawHeader(y);

    rows.forEach((cells, r) => {
      doc.font('Helvetica').fontSize(7);
      const rowH =
        Math.max(
          ...cells.map((c, i) =>
            doc.heightOfString(c, { width: widths[i] - pad * 2 }),
          ),
        ) +
        pad * 2;

      if (y + rowH > this.bottomLimit(doc)) {
        doc.addPage();
        y = drawHeader(doc.page.margins.top);
      }

      doc.rect(x, y, width, rowH).fill(r % 2 === 0 ? C.panel : C.white);
      doc.rect(x, y, width, rowH).strokeColor(C.line).lineWidth(0.5).stroke();
      drawColumnLines(y, rowH, C.line);

      doc.font('Helvetica').fontSize(7).fillColor(C.text);
      let cx = x;
      cells.forEach((c, i) => {
        doc.text(c, cx + pad, y + pad, {
          width: widths[i] - pad * 2,
          align: i === 0 ? 'center' : 'left',
        });
        cx += widths[i];
      });
      y += rowH;
    });

    return y;
  }

  private upper(value: string): string {
    return (value || '').toString().trim().toUpperCase();
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** La dependencia lineal (padre) ya se muestra aparte; no se repite como funcional. */
  private dependenciasSinPadre(
    detail: UnidadPdfDetail,
  ): NonNullable<UnidadPdfDetail['dependenciasFuncionales']> {
    const parentId = detail.parent?.id != null ? Number(detail.parent.id) : null;
    const seen = new Set<number>();
    return (detail.dependenciasFuncionales || []).filter((d) => {
      if (d.id == null) return true;
      const id = Number(d.id);
      if (id === parentId || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private bulletList(lines: string[]): string {
    const clean = lines.map((l) => this.upper(l)).filter(Boolean);
    return clean.length ? clean.map((l) => `• ${l}`).join('\n') : '-';
  }

  private listNames(
    items?: { nombre?: string | null; sigla?: string | null }[],
  ): string {
    return this.bulletList(
      (items || []).map((i) => {
        const nombre = (i.nombre || '').trim();
        const sigla = (i.sigla || '').trim();
        if (!nombre) return sigla;
        return sigla && sigla !== nombre ? `${nombre} (${sigla})` : nombre;
      }),
    );
  }

  private listDescripciones(
    items?: { descripcion?: string | null }[],
  ): string {
    return this.bulletList((items || []).map((i) => i.descripcion || ''));
  }
}
