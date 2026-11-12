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
import { ProgramaUnidad } from './programa-unidad.entity';
import { TipoPrograma } from './tipo-programa.entity';

/**
 * Programa de unidades de Decanato hacia abajo. Su tipo sale del catálogo
 * `tipo_programa`. Un programa conjunto se vincula a varias unidades vía
 * `programa_unidad` y cuenta en cada una.
 */
@Entity('programa')
@Index('IDX_programa_tipo_programa', ['tipoProgramaId'])
export class Programa extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_programa',
  })
  id: string;

  @Column({ name: 'tipo_programa_id', type: 'integer' })
  tipoProgramaId: number;

  @ManyToOne(() => TipoPrograma, { nullable: false })
  @JoinColumn({
    name: 'tipo_programa_id',
    foreignKeyConstraintName: 'FK_programa_tipo_programa',
  })
  tipoPrograma: TipoPrograma;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text' })
  detalle: string;

  @Column({ type: 'text', nullable: true })
  resolucion: string | null;

  @OneToMany(() => ProgramaUnidad, (pu) => pu.programa)
  unidades: ProgramaUnidad[];
}
