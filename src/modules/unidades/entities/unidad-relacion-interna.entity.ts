import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Unidad } from './unidad.entity';

@Entity('unidad_relacion_interna')
@Unique(['unidadId', 'relacionadaId'])
export class UnidadRelacionInterna extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Unidad, (unidad) => unidad.relacionesInternas, {
    nullable: false,
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @ManyToOne(() => Unidad, { nullable: false })
  @JoinColumn({ name: 'relacionada_id' })
  relacionada: Unidad;

  @Column({ name: 'relacionada_id', type: 'bigint' })
  relacionadaId: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  tipo: string | null;
}
