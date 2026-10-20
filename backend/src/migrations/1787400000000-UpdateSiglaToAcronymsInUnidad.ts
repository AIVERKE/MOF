import { MigrationInterface, QueryRunner } from 'typeorm';

function slugAcronym(name: string, fallbackId: string | number): string {
  if (!name) return `U${fallbackId}`;
  const clean = name.trim().toUpperCase();

  if (clean === 'RECTORADO') return 'REC';
  if (clean === 'VICERRECTORADO') return 'VR';
  if (clean === 'CONGRESO INTERNO') return 'CI';
  if (clean === 'ASAMBLEA DOCENTE ESTUDIANTIL') return 'ADE';
  if (clean === 'HONORABLE CONSEJO UNIVERSITARIO') return 'HCU';
  if (clean.includes('COMITE EJECUTIVO DEL HONORABLE CONSEJO')) return 'CE-HCU';
  if (clean === 'SECRETARÍA GENERAL' || clean === 'SECRETARIA GENERAL')
    return 'SG';

  const prefixMatch = clean.match(/^([A-Z0-9]{2,10})\s*[-–]\s*(.+)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const rest = prefixMatch[2];
    if (rest.includes('VICEDECANATO')) return `${prefix}-VD`.slice(0, 32);
    if (rest.includes('DECANATO')) return `${prefix}-DEC`.slice(0, 32);
    if (rest.includes('DIRECCION') || rest.includes('DIRECCIÓN'))
      return `${prefix}-DIR`.slice(0, 32);
    if (rest.includes('CARRERA') || rest.includes('CARR'))
      return `${prefix}-CARR`.slice(0, 32);
    if (rest.includes('INSTITUTO') || rest.includes('INST'))
      return `${prefix}-INST`.slice(0, 32);
    return `${prefix}`.slice(0, 32);
  }

  const stopWords = new Set([
    'DE',
    'DEL',
    'LA',
    'LAS',
    'LOS',
    'Y',
    'E',
    'EN',
    'POR',
    'PARA',
    'A',
    'AL',
  ]);
  const words = clean
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  if (words.length === 1) {
    return words[0].slice(0, 8);
  }

  const initials = words.map((w) => w[0]).join('');
  if (initials.length >= 2 && initials.length <= 10) {
    return initials;
  }

  return clean.slice(0, 12).replace(/\s+/g, '');
}

export class UpdateSiglaToAcronymsInUnidad1787400000000 implements MigrationInterface {
  name = 'UpdateSiglaToAcronymsInUnidad1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT "id", "codigo", "sigla", "nombre" FROM "unidad" ORDER BY "id" ASC`,
    );

    const used = new Map<string, number>();

    // Primero registrar las siglas que ya son válidas y distintas del código
    for (const r of rows) {
      const s = (r.sigla || '').trim();
      const isCode =
        !s ||
        s === r.codigo ||
        s === (r.codigo || '').slice(0, 32) ||
        /^[0-9.]+$/.test(s);
      if (!isCode && s) {
        used.set(s, 1);
      }
    }

    // Luego asignar siglas válidas a todas las unidades que tenían el código como sigla
    for (const r of rows) {
      const s = (r.sigla || '').trim();
      const isCode =
        !s ||
        s === r.codigo ||
        s === (r.codigo || '').slice(0, 32) ||
        /^[0-9.]+$/.test(s);

      if (isCode) {
        let acr = slugAcronym(r.nombre, r.id);
        if (used.has(acr)) {
          const count = (used.get(acr) || 1) + 1;
          used.set(acr, count);
          acr = `${acr}-${count}`.slice(0, 32);
        } else {
          used.set(acr, 1);
        }
        await queryRunner.query(
          `UPDATE "unidad" SET "sigla" = $1 WHERE "id" = $2`,
          [acr, r.id],
        );
      }
    }

    // Asegurar que sigla nunca sea NULL
    await queryRunner.query(
      `ALTER TABLE "unidad" ALTER COLUMN "sigla" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "unidad" SET "sigla" = SUBSTRING("codigo", 1, 32) WHERE "sigla" IS NULL OR "sigla" = ''`,
    );
  }
}
