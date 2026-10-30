import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ProyectoUnidad } from './proyecto-unidad.entity';

/**
 * Proyecto de unidades de Decanato hacia abajo. `tipo` es texto libre (sin
 * catálogo). Un proyecto conjunto se vincula a varias unidades vía
 * `proyecto_unidad` y cuenta en cada una.
 */
@Entity('proyecto')
export class Proyecto extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_proyecto',
  })
  id: string;

  @Column({ type: 'text' })
  tipo: string;

  @Column({ type: 'text' })
  detalle: string;

  @OneToMany(() => ProyectoUnidad, (pu) => pu.proyecto)
  unidades: ProyectoUnidad[];
}
