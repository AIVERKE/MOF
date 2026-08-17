import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Unidad } from './unidad.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('unidad_jerarquia_hist')
export class UnidadJerarquiaHist {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Unidad, { nullable: false })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @ManyToOne(() => Unidad, { nullable: true })
  @JoinColumn({ name: 'parent_id_anterior' })
  parentAnterior: Unidad | null;

  @Column({ name: 'parent_id_anterior', type: 'bigint', nullable: true })
  parentIdAnterior: string | null;

  @ManyToOne(() => Unidad, { nullable: true })
  @JoinColumn({ name: 'parent_id_nuevo' })
  parentNuevo: Unidad | null;

  @Column({ name: 'parent_id_nuevo', type: 'bigint', nullable: true })
  parentIdNuevo: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  razon: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: Usuario | null;

  @Column({ name: 'changed_by', type: 'bigint', nullable: true })
  changedBy: string | null;
}
