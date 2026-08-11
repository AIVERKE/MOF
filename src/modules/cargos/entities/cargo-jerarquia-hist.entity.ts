import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cargo } from './cargo.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('cargo_jerarquia_hist')
export class CargoJerarquiaHist {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Cargo, { nullable: false })
  @JoinColumn({ name: 'cargo_id' })
  cargo: Cargo;

  @Column({ name: 'cargo_id', type: 'bigint' })
  cargoId: string;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: 'parent_id_anterior' })
  parentAnterior: Cargo | null;

  @Column({ name: 'parent_id_anterior', type: 'bigint', nullable: true })
  parentIdAnterior: string | null;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: 'parent_id_nuevo' })
  parentNuevo: Cargo | null;

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
