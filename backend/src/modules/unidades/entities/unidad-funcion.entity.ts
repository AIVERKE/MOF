import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Unidad } from './unidad.entity';

@Entity('unidad_funcion')
export class UnidadFuncion extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Unidad, (unidad) => unidad.funciones, { nullable: false })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @Column({ type: 'int', default: 1 })
  orden: number;

  @Column({ type: 'varchar', length: 1024 })
  funcion: string;

  @Column({ name: 'base_legal', type: 'varchar', length: 1024, nullable: true })
  baseLegal: string | null;
}
