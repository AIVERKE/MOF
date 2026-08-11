import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Unidad } from './entities/unidad.entity';

@Injectable()
export class UnidadPdfService {
  async buildUnidadPdf(
    unidad: Unidad,
    funciones: { funcion: string; baseLegal: string | null }[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Manual de Organización y Funciones', {
        align: 'center',
      });
      doc.moveDown();
      doc.fontSize(14).text(unidad.nombre, { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Código: ${unidad.codigo}`);
      doc.text(`Sigla: ${unidad.sigla}`);
      doc.text(`Tipo: ${unidad.tipo?.descripcion ?? '-'}`);
      doc.text(`Nivel: ${unidad.nivel?.descripcion ?? '-'}`);
      doc.text(`Relación: ${unidad.relacion?.descripcion ?? '-'}`);
      doc.text(`Clase: ${unidad.tipoUnidad?.descripcion ?? '-'}`);
      doc.text(`Oficial: ${unidad.oficial ? 'Sí' : 'No'}`);
      if (unidad.objetivo) {
        doc.moveDown();
        doc.text('Objetivo:');
        doc.text(unidad.objetivo);
      }
      if (unidad.baseLegal) {
        doc.moveDown();
        doc.text('Base legal:');
        doc.text(unidad.baseLegal);
      }
      if (funciones.length) {
        doc.moveDown();
        doc.text('Funciones:');
        funciones.forEach((f, i) => {
          doc.text(`${i + 1}. ${f.funcion}`);
          if (f.baseLegal) doc.text(`   Base legal: ${f.baseLegal}`);
        });
      }
      doc.end();
    });
  }
}
