import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Unidad } from './unidad.entity';

/**
 * Ítems de texto libre de la sección "Relacionamiento y coordinación interna"
 * (ej. "Unidades Organizacionales de la Facultad"). Las unidades del catálogo
 * vinculadas siguen en `unidad_relacion_interna`.
 */
@Entity('unidad_coordinacion_interna')
@Index('IDX_unidad_coordinacion_interna_unidad', ['unidadId'])
export class UnidadCoordinacionInterna extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Unidad, (unidad) => unidad.coordinacionesInternas, {
    nullable: false,
  })
  @JoinColumn({
    name: 'unidad_id',
    foreignKeyConstraintName: 'FK_unidad_coordinacion_interna_unidad',
  })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @Column({ type: 'text' })
  descripcion: string;
}
