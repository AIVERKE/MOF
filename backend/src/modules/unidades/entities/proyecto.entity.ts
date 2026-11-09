import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ProyectoUnidad } from './proyecto-unidad.entity';
import { TipoProyecto } from './tipo-proyecto.entity';

/**
 * Proyecto de unidades de Decanato hacia abajo. Su tipo sale del catálogo
 * `tipo_proyecto`. Un proyecto conjunto se vincula a varias unidades vía
 * `proyecto_unidad` y cuenta en cada una.
 */
@Entity('proyecto')
@Index('IDX_proyecto_tipo_proyecto', ['tipoProyectoId'])
export class Proyecto extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_proyecto',
  })
  id: string;

  @Column({ name: 'tipo_proyecto_id', type: 'integer' })
  tipoProyectoId: number;

  @ManyToOne(() => TipoProyecto, { nullable: false })
  @JoinColumn({
    name: 'tipo_proyecto_id',
    foreignKeyConstraintName: 'FK_proyecto_tipo_proyecto',
  })
  tipoProyecto: TipoProyecto;

  @Column({ type: 'text' })
  detalle: string;

  @OneToMany(() => ProyectoUnidad, (pu) => pu.proyecto)
  unidades: ProyectoUnidad[];
}
