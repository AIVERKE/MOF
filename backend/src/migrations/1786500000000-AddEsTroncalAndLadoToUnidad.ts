import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEsTroncalAndLadoToUnidad1786500000000 implements MigrationInterface {
    name = 'AddEsTroncalAndLadoToUnidad1786500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "es_troncal" boolean NOT NULL DEFAULT false`
        );
        await queryRunner.query(
            `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "lado" character varying(20) NOT NULL DEFAULT 'AUTOMATICO'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "lado"`
        );
        await queryRunner.query(
            `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "es_troncal"`
        );
    }
}
