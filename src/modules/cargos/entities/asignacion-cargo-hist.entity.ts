import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AsignacionCargo } from './asignacion-cargo.entity';
import { CargoNivel } from './cargo-nivel.entity';
import { Cargo } from './cargo.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('asignacion_cargo_hist')
export class AsignacionCargoHist {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => AsignacionCargo, { nullable: false })
  @JoinColumn({ name: 'asignacion_cargo_id' })
  asignacionCargo: AsignacionCargo;

  @Column({ name: 'asignacion_cargo_id', type: 'bigint' })
  asignacionCargoId: string;

  @ManyToOne(() => CargoNivel, { nullable: true })
  @JoinColumn({ name: 'cargo_nivel_id_anterior' })
  cargoNivelAnterior: CargoNivel | null;

  @Column({ name: 'cargo_nivel_id_anterior', type: 'smallint', nullable: true })
  cargoNivelIdAnterior: number | null;

  @ManyToOne(() => CargoNivel, { nullable: true })
  @JoinColumn({ name: 'cargo_nivel_id_nuevo' })
  cargoNivelNuevo: CargoNivel | null;

  @Column({ name: 'cargo_nivel_id_nuevo', type: 'smallint', nullable: true })
  cargoNivelIdNuevo: number | null;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: 'cargo_id_anterior' })
  cargoAnterior: Cargo | null;

  @Column({ name: 'cargo_id_anterior', type: 'bigint', nullable: true })
  cargoIdAnterior: string | null;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: 'cargo_id_nuevo' })
  cargoNuevo: Cargo | null;

  @Column({ name: 'cargo_id_nuevo', type: 'bigint', nullable: true })
  cargoIdNuevo: string | null;

  @ManyToOne(() => Unidad, { nullable: true })
  @JoinColumn({ name: 'unidad_id_anterior' })
  unidadAnterior: Unidad | null;

  @Column({ name: 'unidad_id_anterior', type: 'bigint', nullable: true })
  unidadIdAnterior: string | null;

  @ManyToOne(() => Unidad, { nullable: true })
  @JoinColumn({ name: 'unidad_id_nuevo' })
  unidadNueva: Unidad | null;

  @Column({ name: 'unidad_id_nuevo', type: 'bigint', nullable: true })
  unidadIdNuevo: string | null;

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
