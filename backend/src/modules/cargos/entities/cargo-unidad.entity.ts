import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Cargo } from './cargo.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';

@Entity('cargo_unidad')
@Index('UQ_cargo_unidad_unidad_cargo', ['unidadId', 'cargoId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CargoUnidad extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

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

  /** Nivel del cargo dentro de esta unidad; al asignar se copia de cargo.nivel_orden. */
  @Column({ name: 'nivel_orden', type: 'smallint', nullable: true })
  nivelOrden: number | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
