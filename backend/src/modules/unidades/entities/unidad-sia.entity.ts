import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Unidad } from './unidad.entity';

/** Filas SIA de una Carrera. Nuevas columnas: agregar aquí, en el DTO y en `SIA_CAMPOS`. */
@Entity('unidad_sia')
@Index('IDX_unidad_sia_unidad', ['unidadId'])
@Check('CHK_unidad_sia_aprobados', '"aprobados" IS NULL OR "aprobados" >= 0')
@Check('CHK_unidad_sia_reprobados', '"reprobados" IS NULL OR "reprobados" >= 0')
@Check(
  'CHK_unidad_sia_matriculados',
  '"matriculados" IS NULL OR "matriculados" >= 0',
)
export class UnidadSia extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Unidad, (unidad) => unidad.sia, { nullable: false })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @Column({ type: 'int', nullable: true })
  aprobados: number | null;

  @Column({ type: 'int', nullable: true })
  reprobados: number | null;

  @Column({ type: 'int', nullable: true })
  matriculados: number | null;
}
