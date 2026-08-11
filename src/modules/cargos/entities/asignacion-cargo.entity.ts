import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Persona } from '../../personas/entities/persona.entity';
import { Cargo } from './cargo.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { CargoNivel } from './cargo-nivel.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('asignacion_cargo')
@Index(['unidadId', 'cargoId'])
export class AsignacionCargo extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  @Column({ name: 'id_persona', type: 'bigint' })
  idPersona: string;

  @ManyToOne(() => Cargo, { nullable: false })
  @JoinColumn({ name: 'cargo_id' })
  cargo: Cargo;

  @Column({ name: 'cargo_id', type: 'bigint' })
  cargoId: string;

  @ManyToOne(() => Unidad, { nullable: false })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @ManyToOne(() => CargoNivel, { nullable: false })
  @JoinColumn({ name: 'cargo_nivel_id' })
  cargoNivel: CargoNivel;

  @Column({ name: 'cargo_nivel_id', type: 'smallint' })
  cargoNivelId: number;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: Date | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: Usuario | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: Usuario | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;
}
