import { ConfigService } from '@nestjs/config';
import { UnidadPdfDetail, UnidadPdfService } from './unidad-pdf.service';

const config = { get: () => undefined } as unknown as ConfigService;

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
  relacionesExternas: Array.from({ length: 13 }, (_, i) => ({
    descripcion:
      i === 0
        ? 'Ministerio de Educación\u200B – Viceministerio de Ciencia y Tecnología'
        : i === 1
          ? 'Cooperación Sueca (ASDI)\n- Programa de investigación\n- Becas de postgrado'
          : `${i + 1}. Gobierno Autónomo Municipal, convenio\uF0B7 n° ${i + 1} → año ${2010 + i}`,
  })),
};

describe('UnidadPdfService', () => {
  const service = new UnidadPdfService(config);
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
      expect(clean('a → b ≥ c ✓ \uF0B7 d')).toBe('a -> b >= c - • d');
    });

    it('keeps Spanish text and common punctuation intact', () => {
      const text = 'Año «Señal» – “Información” • 50 € ¿Sí? ¡No!';
      expect(clean(text)).toBe(text);
    });
  });

  describe('bulletList', () => {
    const bullets = (items: string[]) => service['bulletList'](items);

    it('adds a bullet only when the item has no list marker', () => {
      expect(bullets(['uno', '2. dos', '- tres'])).toBe(
        '• UNO\n2. DOS\n- TRES',
      );
    });

    it('indents continuation lines under an added bullet', () => {
      expect(bullets(['título\ndetalle\n- sub'])).toBe(
        '• TÍTULO\n   DETALLE\n   - SUB',
      );
    });

    it('keeps an item that is already a numbered list aligned', () => {
      expect(bullets(['1. uno\n2. dos\nsigue'])).toBe(
        '1. UNO\n2. DOS\n   SIGUE',
      );
    });

    it('returns a dash for empty lists', () => {
      expect(bullets(['', '  '])).toBe('-');
    });
  });

  it('builds a DIPGIS-like PDF with the embedded Unicode font', async () => {
    const pdf = await service.buildUnidadPdf(dipgisLike);
    const raw = pdf.toString('latin1');
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain('NotoSans-Regular');
    expect(raw).toContain('NotoSans-Bold');
    expect(raw).not.toMatch(/\/BaseFont \/Helvetica/);
  });
});
