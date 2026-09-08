import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedUnidadesTroncalesYLados1786550000000 implements MigrationInterface {
  name = 'SeedUnidadesTroncalesYLados1786550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Eje Central Institucional Troncal (Gobierno Universitario UMSA)
    await queryRunner.query(`
      UPDATE "unidad"
      SET "es_troncal" = true, "lado" = 'CENTRO'
      WHERE "id" IN ('1', '30', '31', '32', '33', '44')
         OR "sigla" IN ('100000000000', '100002', '100003', '100004', '1.0.0.0.0.0.0.0.0.0.0.0.0', '1.1.0.0.0.0.0.0.0.0.0.0.0.0');
    `);

    // 2. Ala Izquierda (Facultades y dependencias administrativas / institucionales)
    await queryRunner.query(`
      UPDATE "unidad"
      SET "lado" = 'IZQUIERDA'
      WHERE "id" IN (
        '56', '57', '59', '60', '61', '63', '65', '67', '69', '70', '72', '73',
        '76', '151', '167', '168', '174', '179', '180', '184'
      );
    `);

    // 3. Ala Derecha (Facultades y dependencias académicas / técnicas)
    await queryRunner.query(`
      UPDATE "unidad"
      SET "lado" = 'DERECHA'
      WHERE "id" IN (
        '78', '83', '141', '142', '143', '147', '176', '191', '195', '199', '203',
        '207', '208', '209', '212', '215', '216', '217', '218'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "unidad"
      SET "es_troncal" = false, "lado" = 'AUTOMATICO'
      WHERE "id" IN (
        '1', '30', '31', '32', '33', '44',
        '56', '57', '59', '60', '61', '63', '65', '67', '69', '70', '72', '73',
        '76', '151', '167', '168', '174', '179', '180', '184',
        '78', '83', '141', '142', '143', '147', '176', '191', '195', '199', '203',
        '207', '208', '209', '212', '215', '216', '217', '218'
      );
    `);
  }
}
