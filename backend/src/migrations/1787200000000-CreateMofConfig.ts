import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fila única de configuración MOF (defaults, reglas, paleta y política de
 * contraseñas). Si no hay fila, el servicio usa los valores hardcodeados
 * históricos como fallback.
 */
export class CreateMofConfig1787200000000 implements MigrationInterface {
  name = 'CreateMofConfig1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mof_config" (
        "id" smallint NOT NULL DEFAULT 1,
        "defaults" jsonb NOT NULL,
        "reglas" jsonb NOT NULL,
        "paleta" jsonb NOT NULL,
        "password_policy" jsonb NOT NULL DEFAULT '{"minLength":6}',
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mof_config" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_mof_config_singleton" CHECK ("id" = 1)
      )
    `);

    await queryRunner.query(`
      INSERT INTO "mof_config" ("id", "defaults", "reglas", "paleta", "password_policy")
      VALUES (
        1,
        '{"tipo":1,"nivel":1,"relacion":1,"clase":1,"color":"#1976D2","lado":"AUTOMATICO","oficial":true,"es_troncal":false}',
        '{"pesoNulo":99,"pesoDefault":10,"defaultClaseColor":"#757575","staffRelacionCodigos":["S"],"ladoTroncalForzado":"CENTRO"}',
        '[
          ["#1976D2","#2196F3","#03A9F4","#00BCD4","#00ACC1"],
          ["#2E7D32","#4CAF50","#8BC34A","#CDDC39","#C0CA33"],
          ["#FF8F00","#FFA000","#FFC107","#FFEB3B","#FDD835"],
          ["#C62828","#E53935","#F44336","#EF5350","#E91E63"],
          ["#6A1B9A","#8E24AA","#9C27B0","#AB47BC","#BA68C8"],
          ["#E65100","#EF6C00","#F57C00","#FB8C00","#FF9800"],
          ["#00695C","#00796B","#00897B","#009688","#26A69A"],
          ["#1A237E","#283593","#303F9F","#3949AB","#3F51B5"],
          ["#37474F","#455A64","#607D8B","#78909C","#90A4AE"],
          ["#4E342E","#5D4037","#6D4C41","#795548","#8D6E63"],
          ["#212121","#424242","#616161","#757575","#9E9E9E"],
          ["#BF360C","#D84315","#E64A19","#F4511E","#FF5722"]
        ]'::jsonb,
        '{"minLength":6}'
      )
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mof_config"`);
  }
}
