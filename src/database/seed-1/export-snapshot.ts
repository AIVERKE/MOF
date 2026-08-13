import { writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { config } from 'dotenv';

config();

/** Domain tables produced by ScriptETL (FK-safe order). */
const TABLES: { name: string; pk?: string; nullParent?: boolean }[] = [
  { name: 'catalogo_tipo', pk: 'id' },
  { name: 'catalogo_nivel', pk: 'id' },
  { name: 'catalogo_relacion', pk: 'id' },
  { name: 'tipo_unidad', pk: 'id' },
  { name: 'persona', pk: 'id_persona' },
  { name: 'cargo_nivel', pk: 'id' },
  { name: 'cargo', pk: 'id' },
  { name: 'unidad', pk: 'id', nullParent: true },
  { name: 'unidad_funcion', pk: 'id' },
  { name: 'unidad_dependencia_funcional' },
  { name: 'unidad_relacion_externa', pk: 'id' },
  { name: 'unidad_relacion_interna', pk: 'id' },
  { name: 'unidad_jerarquia_hist', pk: 'id' },
  { name: 'cargo_unidad', pk: 'id' },
  { name: 'asignacion_cargo', pk: 'id' },
];

function sqlLiteral(value: unknown, udt: string): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) {
    if (udt === 'date') return `'${value.toISOString().slice(0, 10)}'`;
    return `'${value.toISOString()}'`;
  }
  if (typeof value === 'string') {
    if (udt === 'date' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return `'${value.slice(0, 10)}'`;
    }
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `E'${escaped}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'mof_db',
  });

  const lines: string[] = [
    '-- Snapshot de datos MOF (salida del ScriptETL).',
    `-- Generado: ${new Date().toISOString()}`,
    '-- Regenerar: npm run seed:export',
    '',
  ];

  try {
    for (const table of TABLES) {
      const cols = await pool.query<{
        column_name: string;
        udt_name: string;
      }>(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table.name],
      );
      if (!cols.rowCount) {
        throw new Error(`Tabla no encontrada: ${table.name}`);
      }

      const colNames = cols.rows.map((c) => c.column_name);
      const udtByCol = new Map(cols.rows.map((c) => [c.column_name, c.udt_name]));
      const quotedCols = colNames.map((c) => `"${c}"`).join(', ');

      const rows = await pool.query(`SELECT * FROM "${table.name}"`);
      lines.push(`-- ${table.name} (${rows.rowCount} filas)`);

      if (!rows.rowCount) {
        lines.push('');
        continue;
      }

      const parentUpdates: string[] = [];

      for (const row of rows.rows) {
        const values = colNames.map((col) => {
          if (table.nullParent && col === 'parent_id') return 'NULL';
          return sqlLiteral(row[col], udtByCol.get(col) || 'text');
        });
        lines.push(
          `INSERT INTO "${table.name}" (${quotedCols}) VALUES (${values.join(', ')});`,
        );

        if (table.nullParent && row.parent_id != null) {
          parentUpdates.push(
            `UPDATE "unidad" SET "parent_id" = ${sqlLiteral(row.parent_id, 'int8')} WHERE "id" = ${sqlLiteral(row.id, 'int8')};`,
          );
        }
      }

      if (parentUpdates.length) {
        lines.push(`-- unidad parent_id (${parentUpdates.length})`);
        lines.push(...parentUpdates);
      }

      if (table.pk) {
        lines.push(
          `SELECT setval(pg_get_serial_sequence('${table.name}', '${table.pk}'), GREATEST((SELECT COALESCE(MAX("${table.pk}"), 1) FROM "${table.name}"), 1));`,
        );
      }
      lines.push('');
    }

    lines.push('');

    const out = join(__dirname, 'etl-snapshot.sql');
    writeFileSync(out, lines.join('\n'), 'utf8');
    console.log(`Snapshot escrito: ${out} (${lines.length} líneas)`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
