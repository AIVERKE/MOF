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
  parent?: { id: number; codigo?: string; nombre?: string; sigla?: string } | null;
  funciones?: { funcion: string; baseLegal?: string | null }[];
  dependenciasFuncionales?: { nombre?: string | null; sigla?: string | null }[];
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
      const pageH = doc.page.height;
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
      const funcionales = this.joinNames(detail.dependenciasFuncionales);
      const lineal = this.joinNames(detail.hijasLineales);
      const funcional = this.joinNames(detail.hijasFuncionales);
      const objetivo = (detail.objetivo || '-').toString().trim();
      const funcionesText = this.formatFunciones(detail.funciones);
      const baseLegal = this.formatBaseLegal(
        detail.funciones,
        detail.baseLegal || detail.base_legal,
      );
      const relInterno = this.joinNames(detail.relacionesInternas);
      const relExterno = this.joinDescripciones(detail.relacionesExternas);

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
        .text('Sistema de Manual de Organización y Funciones (MOF)', headerTextX, 30, {
          width: headerTextW,
        });
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
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C.muted)
        .text(`Código: ${codigo}`, marginL + contentW - 118, y + 9, {
          width: 108,
          align: 'right',
        });

      y += 38;

      // —— Identidad + estructura ——
      const identityTop = y;
      const boxPad = 8;
      const identityBoxH = 118;

      doc.roundedRect(leftX, identityTop, colW, identityBoxH, 3).fill(C.panel);
      doc
        .roundedRect(leftX, identityTop, colW, identityBoxH, 3)
        .strokeColor(C.line)
        .lineWidth(0.8)
        .stroke();

      let iy = identityTop + boxPad;
      this.drawMetaRow(doc, leftX + boxPad, iy, 'Resolución', resCreacion, colW - boxPad * 2);
      iy = doc.y + 5;
      this.drawMetaRow(doc, leftX + boxPad, iy, 'Fecha creación', fecCreacion, colW - boxPad * 2);
      iy = doc.y + 5;
      this.drawMetaRow(doc, leftX + boxPad, iy, 'Nivel jerárquico', nivel, colW - boxPad * 2);
      iy = doc.y + 5;
      this.drawMetaRow(doc, leftX + boxPad, iy, 'Tipo', tipo, colW - boxPad * 2);
      iy = doc.y + 5;
      this.drawMetaRow(doc, leftX + boxPad, iy, 'Dependencia lineal', dependencia, colW - boxPad * 2);

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
      doc
        .roundedRect(rightX + 16, unitBoxY, colW - 32, 36, 2)
        .fill(C.gold);
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
      y = this.drawSectionBar(doc, marginL, y, 'DEPENDENCIAS', contentW);
      y += 6;
      const depH = 62;
      doc.roundedRect(marginL, y, contentW, depH, 3).fill(C.panel);
      doc
        .roundedRect(marginL, y, contentW, depH, 3)
        .strokeColor(C.line)
        .lineWidth(0.6)
        .stroke();
      let dy = y + 6;
      this.drawMetaRow(doc, marginL + 8, dy, 'Funcionales', funcionales, contentW - 16, 1);
      dy = doc.y + 4;
      this.drawMetaRow(doc, marginL + 8, dy, 'Dependientes (lineal)', lineal, contentW - 16, 1);
      dy = doc.y + 4;
      this.drawMetaRow(
        doc,
        marginL + 8,
        dy,
        'Dependientes (funcional)',
        funcional,
        contentW - 16,
        1,
      );
      y += depH + 10;

      // —— Objetivo ——
      y = this.drawSectionBar(doc, marginL, y, 'OBJETIVO', contentW);
      y += 6;
      const objH = 42;
      doc.roundedRect(marginL, y, contentW, objH, 3).fill(C.panel);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.text)
        .text(objetivo, marginL + 8, y + 6, {
          width: contentW - 16,
          height: objH - 10,
          ellipsis: true,
          align: 'justify',
        });
      y += objH + 10;

      // —— Funciones | Base legal ——
      y = this.drawSectionBar(doc, marginL, y, 'FUNCIONES Y BASE LEGAL', contentW);
      y += 6;
      const bodyH = 118;
      doc.roundedRect(leftX, y, colW, bodyH, 3).fill(C.panel);
      doc.roundedRect(rightX, y, colW, bodyH, 3).fill(C.panel);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(C.navyMid)
        .text('Funciones', leftX + 8, y + 6, { width: colW - 16 });
      doc.text('Base legal', rightX + 8, y + 6, { width: colW - 16 });
      doc
        .moveTo(leftX + 8, y + 18)
        .lineTo(leftX + colW - 8, y + 18)
        .strokeColor(C.gold)
        .lineWidth(0.8)
        .stroke();
      doc
        .moveTo(rightX + 8, y + 18)
        .lineTo(rightX + colW - 8, y + 18)
        .strokeColor(C.gold)
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.text)
        .text(funcionesText, leftX + 8, y + 22, {
          width: colW - 16,
          height: bodyH - 28,
          ellipsis: true,
        });
      doc.text(baseLegal, rightX + 8, y + 22, {
        width: colW - 16,
        height: bodyH - 28,
        ellipsis: true,
      });
      y += bodyH + 10;

      // —— Relacionamiento ——
      y = this.drawSectionBar(
        doc,
        marginL,
        y,
        'RELACIONAMIENTO Y COORDINACIÓN',
        contentW,
      );
      y += 6;
      const relH = 58;
      doc.roundedRect(leftX, y, colW, relH, 3).fill(C.panel);
      doc.roundedRect(rightX, y, colW, relH, 3).fill(C.panel);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(C.navyMid)
        .text('Interno', leftX + 8, y + 6, { width: colW - 16 });
      doc.text('Interinstitucional / externo', rightX + 8, y + 6, {
        width: colW - 16,
      });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.text)
        .text(relInterno, leftX + 8, y + 18, {
          width: colW - 16,
          height: relH - 24,
          ellipsis: true,
        });
      doc.text(relExterno, rightX + 8, y + 18, {
        width: colW - 16,
        height: relH - 24,
        ellipsis: true,
      });
      y += relH + 12;

      // —— Footer ——
      const footerH = 78;
      const footerY = Math.max(y, pageH - footerH - 16);
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
    const url = `${base}/unidad/${unidadId}`;
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
    doc
      .rect(x, y, 4, h)
      .fill(C.gold);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.white)
      .text(title, x + 10, y + 4, { width: width - 14 });
    return y + h;
  }

  private drawMetaRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    label: string,
    value: string,
    width: number,
    maxLines = 2,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .fillColor(C.muted)
      .text(label.toUpperCase(), x, y, { width });
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.text)
      .text(value || '-', x, doc.y + 0.5, {
        width,
        height: maxLines * 9,
        ellipsis: true,
      });
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

  private joinNames(
    items?: { nombre?: string | null; sigla?: string | null }[],
  ): string {
    if (!items?.length) return '-';
    return this.upper(
      items
        .map((i) => i.nombre || i.sigla || '')
        .filter(Boolean)
        .join(', '),
    );
  }

  private joinDescripciones(
    items?: { descripcion?: string | null }[],
  ): string {
    if (!items?.length) return '-';
    return this.upper(
      items
        .map((i) => i.descripcion || '')
        .filter(Boolean)
        .join('; '),
    );
  }

  private formatFunciones(
    funciones?: { funcion: string; baseLegal?: string | null }[],
  ): string {
    if (!funciones?.length) return '-';
    return funciones
      .map((f, i) => `${i + 1}. ${f.funcion}`)
      .join('\n');
  }

  /**
   * Columna "Base legal": una línea por función (alineada al listado)
   * y, si existe, la base legal general de la unidad al inicio.
   */
  private formatBaseLegal(
    funciones?: { funcion: string; baseLegal?: string | null }[],
    unidadBaseLegal?: string | null,
  ): string {
    const parts: string[] = [];
    const general = (unidadBaseLegal || '').toString().trim();
    if (general) {
      parts.push(general);
    }
    if (funciones?.length) {
      const perFuncion = funciones
        .map((f, i) => {
          const bl = (f.baseLegal || '').toString().trim();
          return bl ? `${i + 1}. ${bl}` : null;
        })
        .filter((line): line is string => Boolean(line));
      if (perFuncion.length) {
        if (general) parts.push(''); // separador visual
        parts.push(...perFuncion);
      }
    }
    return parts.length ? parts.join('\n') : '-';
  }
}
